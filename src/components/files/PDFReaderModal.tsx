import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as mammoth from 'mammoth';
import { loadPdfDocument, renderPdfPage } from '@/services/pdfService';
import { resolveImageUrl, stripExtension, getFileTypeBadgeLabel, detectFileType } from '@/lib/fileUtils';

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
  fileType,
  fileSizeMb,
}) => {
  const resolvedUrl = resolveImageUrl(fileUrl) || fileUrl;

  // Determine the effective file type from prop, MIME, or URL
  const effectiveType = fileType && fileType !== 'other'
    ? fileType
    : detectFileType(fileUrl);

  const isPdf   = effectiveType === 'pdf';
  const isImage = effectiveType === 'image';
  const isVideo = effectiveType === 'video';
  const isAudio = effectiveType === 'audio';
  const isWord  = effectiveType === 'word';
  const isOther = !isPdf && !isImage && !isVideo && !isAudio && !isWord;

  // Reader State
  const [pdfDoc, setPdfDoc]               = useState<any | null>(null);
  const [numPages, setNumPages]           = useState<number>(0);
  const [currentPage, setCurrentPage]     = useState<number>(1);
  const [pageInput, setPageInput]         = useState<string>('1');
  const [scale, setScale]                 = useState<number>(1.2);
  const [rotation, setRotation]           = useState<number>(0);
  const [viewMode, setViewMode]           = useState<ViewMode>('native');
  const [isFullscreen, setIsFullscreen]   = useState<boolean>(false);
  const [isLoadingDoc, setIsLoadingDoc]   = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);

  // Word document HTML output
  const [wordHtml, setWordHtml]           = useState<string>('');
  const [wordLoading, setWordLoading]     = useState<boolean>(false);
  const [wordError, setWordError]         = useState<string | null>(null);

  // Canvas refs
  const mainCanvasRef           = useRef<HTMLCanvasElement | null>(null);
  const continuousContainerRef  = useRef<HTMLDivElement | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setPageInput('1');
      setScale(1.2);
      setRotation(0);
      setViewMode('native');
      setIsFullscreen(false);
      setWordHtml('');
      setWordError(null);
    }
  }, [isOpen]);

  // ── Load PDF ──────────────────────────────────────────────────────────────
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
          console.warn('PDF.js failed, using native iframe:', err);
          setIsLoadingDoc(false);
          setViewMode('native');
        }
      });
    return () => { isMounted = false; };
  }, [isOpen, resolvedUrl, isPdf]);

  // ── Load Word / ODT ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !resolvedUrl || !isWord) return;
    let isMounted = true;
    setWordLoading(true);
    setWordError(null);

    fetch(resolvedUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then(({ value }) => {
        if (isMounted) { setWordHtml(value); setWordLoading(false); }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('mammoth conversion failed:', err);
          setWordError('Could not render this document. You can still download it below.');
          setWordLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [isOpen, resolvedUrl, isWord]);

  // ── PDF single-page render ────────────────────────────────────────────────
  const renderSinglePage = useCallback(async () => {
    if (!pdfDoc || !mainCanvasRef.current || viewMode !== 'single') return;
    try {
      setIsRenderingPage(true);
      const page = await pdfDoc.getPage(currentPage);
      if (mainCanvasRef.current) await renderPdfPage(page, mainCanvasRef.current, scale, rotation);
    } catch (err) {
      console.error('Error rendering PDF page:', err);
    } finally {
      setIsRenderingPage(false);
    }
  }, [pdfDoc, currentPage, scale, rotation, viewMode]);

  useEffect(() => { if (viewMode === 'single') renderSinglePage(); }, [renderSinglePage, viewMode]);

  // ── PDF continuous render ─────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'continuous' || !pdfDoc || !continuousContainerRef.current) return;
    let isMounted = true;
    const renderAll = async () => {
      setIsRenderingPage(true);
      try {
        for (let i = 1; i <= numPages; i++) {
          if (!isMounted) break;
          const canvas = document.getElementById(`continuous-page-${i}`) as HTMLCanvasElement | null;
          if (canvas) { const page = await pdfDoc.getPage(i); await renderPdfPage(page, canvas, scale, rotation); }
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

  // ── Navigation & zoom ─────────────────────────────────────────────────────
  const handlePrevPage = () => { if (currentPage > 1) { const p = currentPage - 1; setCurrentPage(p); setPageInput(String(p)); } };
  const handleNextPage = () => { if (currentPage < numPages) { const p = currentPage + 1; setCurrentPage(p); setPageInput(String(p)); } };
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= numPages) setCurrentPage(n);
    else setPageInput(String(currentPage));
  };
  const handleZoomIn    = () => setScale((p) => Math.min(Number((p + 0.2).toFixed(2)), 3.0));
  const handleZoomOut   = () => setScale((p) => Math.max(Number((p - 0.2).toFixed(2)), 0.5));
  const handleZoomReset = () => setScale(1.2);
  const handleRotate    = () => setRotation((p) => (p + 90) % 360);
  const handlePrint     = () => { const pw = window.open(resolvedUrl, '_blank'); if (pw) pw.focus(); };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
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

  // Shared button styles that match the platform
  const toolBtnClass = 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors';
  const iconBtnClass = 'p-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30';

  // Header icon per file type
  const headerIcon = isPdf ? 'picture_as_pdf' : isImage ? 'image' : isVideo ? 'videocam' : isAudio ? 'headphones' : isWord ? 'article' : 'description';

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/40 ${isFullscreen ? 'p-0' : 'p-4'}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="file-viewer-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white border border-slate-200 shadow-xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'rounded-xl max-w-6xl w-full h-[90vh]'
        }`}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0 gap-3">
          {/* Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`material-symbols-outlined text-primary text-[22px] shrink-0`}>{headerIcon}</span>
            <div className="min-w-0">
              <h2 id="file-viewer-title" className="font-h3 text-primary truncate">
                {stripExtension(title)}
              </h2>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="font-semibold">{getFileTypeBadgeLabel(effectiveType)}</span>
                {fileSizeMb && (
                  <span>· {typeof fileSizeMb === 'number' ? `${fileSizeMb} MB` : fileSizeMb.toString().includes('MB') ? fileSizeMb : `${fileSizeMb} MB`}</span>
                )}
                {numPages > 0 && <span>· {numPages} page{numPages === 1 ? '' : 's'}</span>}
              </p>
            </div>
          </div>

          {/* PDF canvas-mode controls (desktop) */}
          {isPdf && viewMode !== 'native' && (
            <div className="hidden md:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <button type="button" onClick={handlePrevPage} disabled={currentPage <= 1} className={iconBtnClass} title="Previous page">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                <input
                  type="text" value={pageInput}
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
              <button type="button" onClick={handleZoomOut} disabled={scale <= 0.5} className={iconBtnClass} title="Zoom out">
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <button type="button" onClick={handleZoomReset} className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Reset zoom">
                {Math.round(scale * 100)}%
              </button>
              <button type="button" onClick={handleZoomIn} disabled={scale >= 3.0} className={iconBtnClass} title="Zoom in">
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <div className="w-px h-5 bg-slate-200 mx-0.5" />
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
            <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className={toolBtnClass} title="Open in new tab">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span className="hidden md:inline">Full tab</span>
            </a>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsFullscreen((p) => !p); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <span className="material-symbols-outlined text-[22px]">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0" aria-label="Close">
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
              <button type="button" onClick={handleZoomOut} className="p-1"><span className="material-symbols-outlined text-[18px]">zoom_out</span></button>
              <span className="text-[11px] font-mono font-semibold">{Math.round(scale * 100)}%</span>
              <button type="button" onClick={handleZoomIn} className="p-1"><span className="material-symbols-outlined text-[18px]">zoom_in</span></button>
              <button type="button" onClick={handleRotate} className="p-1"><span className="material-symbols-outlined text-[18px]">rotate_right</span></button>
            </div>
          </div>
        )}

        {/* ── Viewport ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden relative bg-slate-100">

          {/* PDF loading indicator */}
          {(isLoadingDoc || isRenderingPage) && isPdf && viewMode !== 'native' && (
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow text-xs font-semibold text-slate-700">
              <span className="material-symbols-outlined text-[16px] text-primary animate-spin">progress_activity</span>
              {isLoadingDoc ? 'Loading…' : 'Rendering…'}
            </div>
          )}

          <div className={`flex-1 h-full overflow-auto flex items-center justify-center ${isPdf && viewMode === 'native' ? '' : 'p-6'}`}>

            {/* ── 1. PDF single-page canvas ── */}
            {isPdf && viewMode === 'single' && (
              <div className="max-w-full flex items-start justify-center">
                <div className="bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden">
                  <canvas ref={mainCanvasRef} className="max-w-full h-auto block" />
                </div>
              </div>
            )}

            {/* ── 2. PDF continuous-scroll canvas ── */}
            {isPdf && viewMode === 'continuous' && (
              <div ref={continuousContainerRef} className="w-full max-w-4xl space-y-6 flex flex-col items-center py-4">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <div key={pageNum} className="bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden flex flex-col items-center">
                    <canvas id={`continuous-page-${pageNum}`} className="max-w-full h-auto block" />
                    <p className="py-1.5 text-[11px] font-mono font-semibold text-slate-400">Page {pageNum} of {numPages}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── 3. PDF native iframe ── */}
            {isPdf && viewMode === 'native' && (
              <div className="w-full h-full">
                <iframe src={`${resolvedUrl}#toolbar=1&navpanes=1&zoom=100`} className="w-full h-full border-0" title={title} />
              </div>
            )}

            {/* ── 4. Image ── */}
            {isImage && (
              <div className="flex items-center justify-center p-4 h-full w-full">
                <img
                  src={resolvedUrl}
                  alt={title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-slate-200"
                />
              </div>
            )}

            {/* ── 5. Video ── */}
            {isVideo && (
              <div className="flex items-center justify-center p-4 h-full w-full bg-black">
                <video
                  src={resolvedUrl}
                  controls
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                  preload="metadata"
                >
                  Your browser does not support the video element.
                </video>
              </div>
            )}

            {/* ── 6. Audio ── */}
            {isAudio && (
              <div className="flex flex-col items-center justify-center gap-6 h-full">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 flex flex-col items-center gap-4 max-w-sm w-full">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[42px] text-primary">headphones</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-800 truncate max-w-xs">{stripExtension(title)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{getFileTypeBadgeLabel('audio')} file</p>
                  </div>
                  <audio src={resolvedUrl} controls className="w-full" preload="metadata">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}

            {/* ── 7. Word / ODT document ── */}
            {isWord && (
              <div className="h-full w-full overflow-auto p-6">
                {wordLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                    <span className="material-symbols-outlined text-[36px] text-primary animate-spin">progress_activity</span>
                    <p className="text-sm font-semibold">Converting document…</p>
                  </div>
                )}
                {wordError && !wordLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-sm space-y-4">
                      <span className="material-symbols-outlined text-[36px] text-slate-400">error_outline</span>
                      <p className="text-sm text-slate-600">{wordError}</p>
                      <a href={resolvedUrl} download className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:opacity-90 shadow-sm transition-opacity">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Download
                      </a>
                    </div>
                  </div>
                )}
                {wordHtml && !wordLoading && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-4xl mx-auto p-8">
                    {/* Prose styles for the mammoth HTML output */}
                    <style>{`
                      .word-preview h1, .word-preview h2, .word-preview h3 { font-weight: 700; margin: 1em 0 0.5em; color: #1e293b; }
                      .word-preview h1 { font-size: 1.5rem; }
                      .word-preview h2 { font-size: 1.25rem; }
                      .word-preview h3 { font-size: 1.1rem; }
                      .word-preview p  { margin: 0.5em 0; line-height: 1.7; color: #334155; font-size: 0.9rem; }
                      .word-preview ul, .word-preview ol { padding-left: 1.5rem; margin: 0.5em 0; }
                      .word-preview li { margin: 0.25em 0; color: #334155; font-size: 0.9rem; }
                      .word-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                      .word-preview td, .word-preview th { border: 1px solid #e2e8f0; padding: 0.5rem; font-size: 0.85rem; }
                      .word-preview th { background: #f8fafc; font-weight: 600; }
                      .word-preview strong, .word-preview b { font-weight: 700; }
                      .word-preview em, .word-preview i { font-style: italic; }
                    `}</style>
                    <div
                      className="word-preview"
                      dangerouslySetInnerHTML={{ __html: wordHtml }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── 8. Other / unsupported ── */}
            {isOther && (
              <div className="text-center p-8 bg-white border border-slate-200 rounded-xl shadow-sm max-w-sm mx-auto space-y-5">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[36px] text-primary">description</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{stripExtension(title)}</h4>
                  <p className="text-xs text-slate-500 mt-1">This file type cannot be previewed in the browser.</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:opacity-90 shadow-sm transition-opacity">
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    Open
                  </a>
                  <a href={resolvedUrl} download className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
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
