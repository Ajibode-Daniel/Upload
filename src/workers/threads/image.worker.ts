import { parentPort, workerData } from 'worker_threads';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { ImageProcessingResult } from '../../types/file.types';

interface WorkerData {
  filePath: string;
}

async function processImage(filePath: string): Promise<ImageProcessingResult> {
  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      data: { message: 'Analyzing image...' }
    });
  }

  // Get image metadata using sharp
  const imageBuffer = await readFile(filePath);
  const metadata = await sharp(imageBuffer).metadata();

  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      data: { message: 'Performing OCR...' }
    });
  }

  // Perform OCR using Tesseract
  const worker = await createWorker('eng');
  const { data } = await worker.recognize(filePath);
  await worker.terminate();

  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      data: { message: 'Finalizing results...' }
    });
  }

  const result: ImageProcessingResult = {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    hasAlpha: metadata.hasAlpha || false,
    ocrText: data.text.trim(),
    confidence: data.confidence,
    metadata: {
      colorSpace: metadata.space,
      density: metadata.density,
      orientation: metadata.orientation,
    },
  };

  return result;
}

// Main worker execution
if (parentPort) {
  const { filePath } = workerData as WorkerData;

  processImage(filePath)
    .then(result => {
      parentPort!.postMessage({ type: 'complete', data: result });
    })
    .catch(error => {
      parentPort!.postMessage({
        type: 'error',
        data: { message: error.message, stack: error.stack }
      });
    });
}