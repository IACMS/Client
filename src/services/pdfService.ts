import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use the local or CDN version
// For Vite/React we typically use the CDN version matching the installed pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function loadPdfDocument(url: string) {
  const loadingTask = pdfjsLib.getDocument({ url });
  return await loadingTask.promise;
}

export async function renderPdfPage(
  page: any, 
  canvas: HTMLCanvasElement, 
  scale: number = 1.0, 
  rotation: number = 0
) {
  const viewport = page.getViewport({ scale, rotation });
  const context = canvas.getContext('2d');
  
  if (!context) return;
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas
  };

  await page.render(renderContext).promise;
}

export async function generatePdfThumbnail(url: string, size: number = 500): Promise<string> {
  const doc = await loadPdfDocument(url);
  const page = await doc.getPage(1);
  
  const viewport = page.getViewport({ scale: 1.0 });
  const scale = size / Math.max(viewport.width, viewport.height);
  const scaledViewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error("Could not create canvas context");
  
  canvas.height = scaledViewport.height;
  canvas.width = scaledViewport.width;
  
  const renderContext: any = {
    canvasContext: context,
    viewport: scaledViewport,
    canvas: canvas
  };
  
  await page.render(renderContext).promise;
  
  return canvas.toDataURL('image/jpeg', 0.8);
}
