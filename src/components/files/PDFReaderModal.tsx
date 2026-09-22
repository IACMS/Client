import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadPdfDocument, renderPdfPage } from '@/services/pdfService';
import { resolveImageUrl, stripExtension, getFileTypeBadgeLabel } from '@/lib/fileUtils';

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

export const PDFReaderModal: React.FC<PDFReaderModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  title = 'Document',
  description,
  fileType = 'pdf',
  fileSizeMb,
}) => {
  const resolvedUrl = resolveImageUrl(fileUrl) || fileUrl;
  const isPdf = fileType === 'pdf' || (fileUrl && fileUrl.toLowerCase().endsWith('.pdf'));
  const isImage = fileType === 'image' || (!isPdf && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl));

  // Reader State
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('native');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);

  // Canvas refs
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const continuousContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setPageInput('1');
      setScale(1.2);
      setRotation(0);
      setViewMode('native');
      setIsFullscreen(false);
    }
  }, [isOpen]);

  // Load PDF Document
  useEffect(() => {
    if (!isOpen || !resolvedUrl || !isPdf) {
      setPdfDoc(null);
      setIsLoadingDoc(false);
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
          console.warn('PDF.js loading failed, using native iframe:', err);
          setIsLoadingDoc(false);
          setViewMode('native');
        }
      });

    return () => { isMounted = false; };
  }, [isOpen, resolvedUrl, isPdf]);

  // Render single page
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
    if (viewMode === 'single') renderSinglePage();
  }, [renderSinglePage, viewMode]);

  // Render continuous pages
  useEffect(() => {
    if (viewMode !== 'continuous' || !pdfDoc || !continuousContainerRef.current) return;
    let isMounted = true;
    const renderAll = async () => {
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
    renderAll();
    return () => { isMounted = false; };
  }, [viewMode, pdfDoc, numPages, scale, rotation]);

  // Navigation
  const handlePrevPage = () => {
    if (currentPage > 1) { const p = currentPage - 1; setCurrentPage(p); setPageInput(String(p)); }
  };
  const handleNextPage = () => {
    if (currentPage < numPages) { const p = currentPage + 1; setCurrentPage(p); setPageInput(String(p)); }
  };
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= numPages) setCurrentPage(n);
    else setPageInput(String(currentPage));
  };
  const handleZoomIn = () => setScale((p) => Math.min(Number((p + 0.2).toFixed(2)), 3.0));
  const handleZoomOut = () => setScale((p) => Math.max(Number((p - 0.2).toFixed(2)), 0.5));
  const handleZoomReset = () => setScale(1.2);
  const handleRotate = () => setRotation((p) => (p + 90) % 360);
  const handlePrint = () => {
    const pw = window.open(resolvedUrl, '_blank');
    if (pw) pw.focus();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrevPage();
      else if (e.key === 'ArrowRight') handleNextPage();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-') handleZoomOut();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, currentPage, numPages, onClose]);

  if (!isOpen) return null;

  // Shared action button class matching the project style
  const toolBtnClass =
    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors';
  const iconBtnClass =
    'p-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30';

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/40 ${
        isFullscreen ? 'p-0' : 'p-4'
      }`}
      role="presentation"
      onClick={onClose}
    >

      {/* Modal shell — mirrors platform modal style */}
      <div
        role="dialog"
        aria-labelledby="file-viewer-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white border border-slate-200 shadow-xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'rounded-xl max-w-6xl w-full h-[90vh]'
        }`}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0 gap-3">
          {/* Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
              {isPdf ? 'picture_as_pdf' : isImage ? 'image' : 'description'}
            </span>
            <div className="min-w-0">
              <h2 id="file-viewer-title" className="font-h3 text-primary truncate">
                {stripExtension(title)}
              </h2>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="font-semibold uppercase">
                  {isPdf ? 'PDF' : isImage ? 'Image' : getFileTypeBadgeLabel(fileType as any)}
                </span>
                {fileSizeMb && (
                  <span>
                    · {typeof fileSizeMb === 'number' ? `${fileSizeMb} MB` : fileSizeMb.toString().includes('MB') ? fileSizeMb : `${fileSizeMb} MB`}
                  </span>
                )}
                {numPages > 0 && <span>· {numPages} page{numPages === 1 ? '' : 's'}</span>}
              </p>
            </div>
          </div>

          {/* PDF canvas-mode controls (desktop) */}
          {isPdf && viewMode !== 'native' && (
            <div className="hidden md:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
              {/* Page navigation */}
              <button type="button" onClick={handlePrevPage} disabled={currentPage <= 1} className={iconBtnClass} title="Previous page">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => setPageInput(String(currentPage))}
                  className="w-9 text-center text-xs font-mono font-semibold py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 ring-primary text-slate-800"
                />
                <span className="text-xs text-slate-400 font-mono">/ {numPages || 1}</span>
              </form>
              <button type="button" onClick={handleNextPage} disabled={currentPage >= numPages} className={iconBtnClass} title="Next page">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>

              <div className="w-px h-5 bg-slate-200 mx-0.5" />

              {/* Zoom */}
              <button type="button" onClick={handleZoomOut} disabled={scale <= 0.5} className={iconBtnClass} title="Zoom out (-)">
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title="Reset zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button type="button" onClick={handleZoomIn} disabled={scale >= 3.0} className={iconBtnClass} title="Zoom in (+)">
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>

              <div className="w-px h-5 bg-slate-200 mx-0.5" />

              {/* Rotate */}
              <button type="button" onClick={handleRotate} className={iconBtnClass} title="Rotate 90°">
                <span className="material-symbols-outlined text-[18px]">rotate_right</span>
              </button>
            </div>
          )}

          {/* Right-side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isPdf && (
              <button type="button" onClick={handlePrint} className={`${toolBtnClass} hidden sm:flex`} title="Print">
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span className="hidden md:inline">Print</span>
              </button>
            )}

            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={toolBtnClass}
              title="Open in new tab"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span className="hidden md:inline">Full tab</span>
            </a>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsFullscreen((p) => !p); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            {/* Close — single button, works in both modes */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* PDF canvas mobile controls strip */}
        {isPdf && viewMode !== 'native' && (
          <div className="flex md:hidden items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handlePrevPage} disabled={currentPage <= 1} className="p-1 disabled:opacity-30">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <span className="text-xs font-mono font-semibold">{currentPage} / {numPages || 1}</span>
              <button type="button" onClick={handleNextPage} disabled={currentPage >= numPages} className="p-1 disabled:opacity-30">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleZoomOut} className="p-1">
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <span className="text-[11px] font-mono font-semibold">{Math.round(scale * 100)}%</span>
              <button type="button" onClick={handleZoomIn} className="p-1">
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button type="button" onClick={handleRotate} className="p-1">
                <span className="material-symbols-outlined text-[18px]">rotate_right</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Main viewport ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden relative bg-slate-100">

          {/* Loading overlay */}
          {(isLoadingDoc || isRenderingPage) && isPdf && viewMode !== 'native' && (
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow text-xs font-semibold text-slate-700">
              <span className="material-symbols-outlined text-[16px] text-primary animate-spin">progress_activity</span>
              {isLoadingDoc ? 'Loading…' : 'Rendering…'}
            </div>
          )}

          <div className={`flex-1 h-full overflow-auto flex items-center justify-center ${isPdf && viewMode === 'native' ? '' : 'p-6'}`}>

            {/* 1. PDF single-page canvas */}
            {isPdf && viewMode === 'single' && (
              <div className="max-w-full flex items-start justify-center">
                <div className="bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden">
                  <canvas ref={mainCanvasRef} className="max-w-full h-auto block" />
                </div>
              </div>
            )}

            {/* 2. PDF continuous-scroll canvas */}
            {isPdf && viewMode === 'continuous' && (
              <div ref={continuousContainerRef} className="w-full max-w-4xl space-y-6 flex flex-col items-center py-4">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <div key={pageNum} className="bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden flex flex-col items-center">
                    <canvas id={`continuous-page-${pageNum}`} className="max-w-full h-auto block" />
                    <p className="py-1.5 text-[11px] font-mono font-semibold text-slate-400">
                      Page {pageNum} of {numPages}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 3. PDF native iframe */}
            {isPdf && viewMode === 'native' && (
              <div className="w-full h-full">
                <iframe
                  src={`${resolvedUrl}#toolbar=1&navpanes=1&zoom=100`}
                  className="w-full h-full border-0"
                  title={title}
                />
              </div>
            )}

            {/* 4. Image file */}
            {isImage && (
              <div className="flex items-center justify-center p-4 h-full w-full">
                <img
                  src={resolvedUrl}
                  alt={title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-slate-200"
                />
              </div>
            )}

            {/* 5. Other file types */}
            {!isPdf && !isImage && (
              <div className="text-center p-8 bg-white border border-slate-200 rounded-xl shadow-sm max-w-sm mx-auto space-y-5">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[36px] text-primary">description</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{stripExtension(title)}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    This file type cannot be previewed in the browser.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:opacity-90 shadow-sm transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    Open
                  </a>
                  <a
                    href={resolvedUrl}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer (description) ───────────────────────────────────── */}
        {description && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 shrink-0">
            <p className="text-xs text-slate-600 line-clamp-1">
              <span className="font-semibold text-slate-800">Note: </span>
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
