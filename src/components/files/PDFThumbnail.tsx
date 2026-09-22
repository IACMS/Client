import React, { useState, useEffect } from 'react';
import { generatePdfThumbnail } from '@/services/pdfService';
import { resolveImageUrl, detectFileType } from '@/lib/fileUtils';

interface PDFThumbnailProps {
  fileUrl: string;
  thumbnailUrl?: string;
  fileType?: string;
  title?: string;
  className?: string;
  imageClassName?: string;
}

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({
  fileUrl,
  thumbnailUrl,
  fileType,
  title,
  className = 'w-full h-full',
  imageClassName = 'w-full h-full object-cover'
}) => {
  const [autoThumbnail, setAutoThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resolvedThumbUrl = resolveImageUrl(thumbnailUrl) || thumbnailUrl;
  const resolvedFileUrl = resolveImageUrl(fileUrl) || fileUrl;
  const actualType = fileType || detectFileType(fileUrl);
  const isPdf = actualType === 'pdf' || (fileUrl && fileUrl.toLowerCase().endsWith('.pdf'));
  const isImage = actualType === 'image' || (!isPdf && detectFileType(fileUrl) === 'image');

  useEffect(() => {
    if (resolvedThumbUrl || isImage || !isPdf || !resolvedFileUrl) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    generatePdfThumbnail(resolvedFileUrl, 500)
      .then((dataUrl) => {
        if (isMounted) {
          setAutoThumbnail(dataUrl);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('PDF Auto-thumbnail fallback:', err?.message || err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedThumbUrl, resolvedFileUrl, isPdf, isImage]);

  if (resolvedThumbUrl) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
        <img
          src={resolvedThumbUrl}
          alt={title || 'Document Preview'}
          className={imageClassName}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  if (isImage && resolvedFileUrl) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
        <img
          src={resolvedFileUrl}
          alt={title || 'Document Image'}
          className={imageClassName}
        />
      </div>
    );
  }

  if (autoThumbnail) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
        <img
          src={autoThumbnail}
          alt={title || 'PDF Page 1 Preview'}
          className={imageClassName}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/70 to-slate-100 dark:from-slate-800 dark:to-indigo-950/40 ${className}`}>
        <div className="p-3 bg-indigo-100/80 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-2">
          <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 animate-spin">progress_activity</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Rendering Preview...
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 via-rose-50/40 to-slate-200 dark:from-slate-800 dark:via-rose-950/20 dark:to-slate-850 ${className}`}>
      <div className="p-4 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl shadow-inner mb-3">
        <span className="material-symbols-outlined text-4xl">{isPdf ? 'picture_as_pdf' : 'description'}</span>
      </div>
      <div>
        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-wider uppercase block">
          {isPdf ? 'PDF DOCUMENT' : 'DOCUMENT'}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
          Click to read in high resolution
        </span>
      </div>
    </div>
  );
};
