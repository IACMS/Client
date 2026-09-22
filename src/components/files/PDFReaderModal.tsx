import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadPdfDocument, renderPdfPage } from '@/services/pdfService';
import { resolveImageUrl, stripExtension, getFileTypeBadgeLabel } from '@/lib/fileUtils';
const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const X = (p: any) => <MaterialIcon name="close" {...p} />;
const Maximize2 = (p: any) => <MaterialIcon name="fullscreen" {...p} />;
const Minimize2 = (p: any) => <MaterialIcon name="fullscreen_exit" {...p} />;
const ChevronLeft = (p: any) => <MaterialIcon name="chevron_left" {...p} />;
const ChevronRight = (p: any) => <MaterialIcon name="chevron_right" {...p} />;
const ZoomIn = (p: any) => <MaterialIcon name="zoom_in" {...p} />;
const ZoomOut = (p: any) => <MaterialIcon name="zoom_out" {...p} />;
const RotateCw = (p: any) => <MaterialIcon name="rotate_right" {...p} />;
const Download = (p: any) => <MaterialIcon name="download" {...p} />;
const Printer = (p: any) => <MaterialIcon name="print" {...p} />;
const ExternalLink = (p: any) => <MaterialIcon name="open_in_new" {...p} />;
const BookOpen = (p: any) => <MaterialIcon name="menu_book" {...p} />;
const FileText = (p: any) => <MaterialIcon name="description" {...p} />;
const Sun = (p: any) => <MaterialIcon name="light_mode" {...p} />;
const Moon = (p: any) => <MaterialIcon name="dark_mode" {...p} />;
const Coffee = (p: any) => <MaterialIcon name="local_cafe" {...p} />;
const Loader2 = ({ className = "" }: { className?: string }) => <span className={`material-symbols-outlined animate-spin ${className}`}>progress_activity</span>;

interface PDFReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title?: string;
  description?: string;
  fileType?: string;
  fileSizeMb?: number | string;
}

type ViewMode = 'single' | 'continuous' | 'native';
type ReadingTheme = 'light' | 'dark' | 'sepia';

export const PDFReaderModal: React.FC<PDFReaderModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  title = 'Document Reader',
  description,
  fileType = 'pdf',
  fileSizeMb
}) => {
  const resolvedUrl = resolveImageUrl(fileUrl) || fileUrl;
  const isPdf = fileType === 'pdf' || (fileUrl && fileUrl.toLowerCase().endsWith('.pdf'));

  // Reader State
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('native');
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('light');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  // Removed loadError state

  // Canvas refs
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const continuousContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Load PDF Document
  useEffect(() => {
    if (!isOpen || !resolvedUrl || !isPdf) {
      setPdfDoc(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDoc(true);

    loadPdfDocument(resolvedUrl)
      .then((doc) => {
        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setPageInput('1');
          setIsLoadingDoc(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('PDF.js loading failed, switching to native browser view mode:', err);
          setIsLoadingDoc(false);
          // Fallback to native mode if PDF.js fails
          setViewMode('native');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, resolvedUrl, isPdf]);

  // 2. Render Current Page (Single Page Mode)
  const renderSinglePage = useCallback(async () => {
    if (!pdfDoc || !mainCanvasRef.current || viewMode !== 'single') return;

    try {
      setIsRenderingPage(true);
      const page = await pdfDoc.getPage(currentPage);
      if (mainCanvasRef.current) {
        await renderPdfPage(page, mainCanvasRef.current, scale, rotation);
      }
    } catch (err) {
      console.error('Error rendering PDF page:', err);
    } finally {
      setIsRenderingPage(false);
    }
  }, [pdfDoc, currentPage, scale, rotation, viewMode]);

  useEffect(() => {
    if (viewMode === 'single') {
      renderSinglePage();
    }
  }, [renderSinglePage, viewMode]);

  // 3. Render Continuous Pages (Continuous Mode)
  useEffect(() => {
    if (viewMode !== 'continuous' || !pdfDoc || !continuousContainerRef.current) return;

    let isMounted = true;
    const renderAllPages = async () => {
      setIsRenderingPage(true);
      try {
        for (let i = 1; i <= numPages; i++) {
          if (!isMounted) break;
          const canvas = document.getElementById(`continuous-page-${i}`) as HTMLCanvasElement | null;
          if (canvas) {
            const page = await pdfDoc.getPage(i);
            await renderPdfPage(page, canvas, scale, rotation);
          }
        }
      } catch (err) {
        console.error('Error rendering continuous pages:', err);
      } finally {
        if (isMounted) setIsRenderingPage(false);
      }
    };

    renderAllPages();
    return () => {
      isMounted = false;
    };
  }, [viewMode, pdfDoc, numPages, scale, rotation]);



  // 5. Navigation & Zoom Handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      setPageInput(String(prev));
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      setPageInput(String(next));
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(Number((prev + 0.2).toFixed(2)), 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(Number((prev - 0.2).toFixed(2)), 0.5));
  };

  const handleZoomReset = () => {
    setScale(1.2);
  };

  const handleFitWidth = () => {
    setScale(1.6);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handlePrint = () => {
    if (resolvedUrl) {
      const printWindow = window.open(resolvedUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    }
  };

  // 6. Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, numPages, onClose]);

  if (!isOpen) return null;

  // Theme styling helpers
  const themeBgClasses = {
    light: 'bg-slate-200/90 dark:bg-slate-950',
    dark: 'bg-slate-950',
    sepia: 'bg-[#f4ecd8] dark:bg-[#2b261f]'
  }[readingTheme];

  const canvasContainerBg = {
    light: 'bg-slate-100 dark:bg-slate-900 shadow-2xl',
    dark: 'bg-slate-900 border border-slate-800 shadow-2xl',
    sepia: 'bg-[#fdfaf2] border border-[#e3d7bf] shadow-2xl'
  }[readingTheme];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      }`}
    >
      {/* Floating Quick-Exit Widget for Fullscreen View */}
      {isFullscreen && (
        <div className="fixed top-4 right-5 z-50 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Exit Fullscreen Mode"
          >
            <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exit Fullscreen</span>
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-md cursor-pointer active:scale-95"
            title="Exit Document Viewer (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      )}

      <div
        className={`relative w-full bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 transition-all duration-300 ${
          isFullscreen ? 'h-full rounded-none' : 'max-w-7xl h-[95vh] rounded-3xl'
        }`}
      >
        {/* ========================================================================= */}
        {/* TOP TOOLBAR                                                               */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 gap-2 sm:gap-4 shrink-0">
          {/* Document Title & Icon */}
          <div className="min-w-0 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shrink-0 shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {stripExtension(title)}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {isPdf ? 'PDF' : getFileTypeBadgeLabel(fileType as any)}
                </span>
                {fileSizeMb && (
                  <span>
                    • {typeof fileSizeMb === 'number' ? `${fileSizeMb} MB` : fileSizeMb.toString().includes('MB') ? fileSizeMb : `${fileSizeMb} MB`}
                  </span>
                )}
                {numPages > 0 && <span>• {numPages} Page{numPages === 1 ? '' : 's'}</span>}
              </p>
            </div>
          </div>

          {/* Reader Center Controls (Page Jump & Zoom) */}
          {isPdf && viewMode !== 'native' && (
            <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              {/* Page Navigation */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                  title="Previous Page (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <form onSubmit={handlePageInputSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={() => setPageInput(String(currentPage))}
                    className="w-10 text-center text-xs font-bold py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-1 font-mono">
                    / {numPages || 1}
                  </span>
                </form>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= numPages}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                  title="Next Page (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="px-2 py-1 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Reset Zoom to 100%"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={scale >= 3.0}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFitWidth}
                  className="px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Fit to Width"
                >
                  Fit
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              {/* Rotate */}
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Reading Theme Palette (Light, Dark, Sepia) */}
            {isPdf && viewMode !== 'native' && (
              <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReadingTheme('light')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    readingTheme === 'light' ? 'bg-white text-amber-500 shadow-xs' : 'text-slate-500'
                  }`}
                  title="Light Theme"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setReadingTheme('sepia')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    readingTheme === 'sepia' ? 'bg-[#f4ecd8] text-[#8b5a2b] shadow-xs' : 'text-slate-500'
                  }`}
                  title="Eye-Care Sepia Theme"
                >
                  <Coffee className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setReadingTheme('dark')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    readingTheme === 'dark' ? 'bg-slate-900 text-indigo-400 shadow-xs' : 'text-slate-500'
                  }`}
                  title="Night Mode"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Print</span>
            </button>

            {/* Open in Full New Tab */}
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-colors shadow-2xs"
              title="Open in New Browser Tab"
            >
              <span>Full Tab</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={`p-2 text-xs font-bold rounded-xl transition-colors cursor-pointer border ${
                isFullscreen
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200/60 dark:border-slate-700/60'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Exit / Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/80 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 ml-1"
              title="Exit Reader (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE CONTROLS STRIP (Visible on small screens)                          */}
        {/* ========================================================================= */}
        {isPdf && viewMode !== 'native' && (
          <div className="flex md:hidden items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 text-slate-700 dark:text-slate-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold font-mono">
                {currentPage} / {numPages || 1}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="p-1 text-slate-700 dark:text-slate-200 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-slate-700 dark:text-slate-200"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 text-slate-700 dark:text-slate-200"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN VIEWPORT AREA                                                        */}
        {/* ========================================================================= */}
        <div className={`flex-1 overflow-hidden relative flex ${themeBgClasses}`}>
          {/* Center Document Canvas or Embed */}
          <div className={`flex-1 overflow-auto flex items-center justify-center relative ${
            isPdf && viewMode === 'native' ? 'p-0' : 'p-4 sm:p-8'
          }`}>
            {/* Loading Indicator */}
            {(isLoadingDoc || isRenderingPage) && viewMode !== 'native' && (
              <div className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold shadow-xl">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>{isLoadingDoc ? 'Loading Document...' : 'Rendering Page...'}</span>
              </div>
            )}

            {/* 1. PDF Single Page Interactive Canvas View */}
            {isPdf && viewMode === 'single' && (
              <div className="max-w-full max-h-full flex items-center justify-center">
                <div className={`p-1 sm:p-2 rounded-2xl transition-all duration-200 ${canvasContainerBg}`}>
                  <canvas
                    ref={mainCanvasRef}
                    className="rounded-xl max-w-full h-auto block shadow-md"
                  />
                </div>
              </div>
            )}

            {/* 2. PDF Continuous Scroll View */}
            {isPdf && viewMode === 'continuous' && (
              <div
                ref={continuousContainerRef}
                className="w-full max-w-4xl space-y-8 flex flex-col items-center py-4"
              >
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <div
                    key={pageNum}
                    className={`p-1.5 sm:p-2 rounded-2xl transition-all duration-200 ${canvasContainerBg} flex flex-col items-center`}
                  >
                    <canvas
                      id={`continuous-page-${pageNum}`}
                      className="rounded-xl max-w-full h-auto block shadow-md"
                    />
                    <div className="w-full py-1 text-center text-[11px] font-mono font-bold text-slate-400">
                      Page {pageNum} of {numPages}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. PDF Native Browser Engine View (<embed> / <iframe>) */}
            {isPdf && viewMode === 'native' && (
              <div className="w-full h-full overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
                <iframe
                  src={`${resolvedUrl}#toolbar=1&navpanes=1&zoom=100`}
                  className="w-full h-full border-0"
                  title={title}
                />
              </div>
            )}

            {/* 4. Non-PDF Images */}
            {!isPdf && fileType === 'image' && (
              <div className="max-w-full max-h-full flex items-center justify-center p-4">
                <img
                  src={resolvedUrl}
                  alt={title}
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
                />
              </div>
            )}

            {/* 5. Non-PDF Generic Documents */}
            {!isPdf && fileType !== 'image' && (
              <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{stripExtension(title)}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Download or open this document with your desktop viewer.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in Browser</span>
                  </a>
                  <a
                    href={resolvedUrl}
                    download
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER SUMMARY                                                            */}
        {/* ========================================================================= */}
        {description && (
          <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0 flex items-center justify-between">
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
              <span className="font-bold text-slate-900 dark:text-white">Summary: </span>
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
