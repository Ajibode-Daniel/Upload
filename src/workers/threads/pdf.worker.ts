import { parentPort, workerData } from 'worker_threads';
import pdf from 'pdf-parse';
import { readFile } from 'fs/promises';
import { PDFProcessingResult } from '../../types/file.types';
import { chunkArray } from '../../utils/helpers';

interface WorkerData {
  filePath: string;
}

async function processPDF(filePath: string): Promise<PDFProcessingResult> {
  const dataBuffer = await readFile(filePath);
  
  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      data: { message: 'Parsing PDF...' }
    });
  }

  const data = await pdf(dataBuffer);

  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      data: { message: 'Extracting text content...' }
    });
  }

  const textContent = data.text;
  const words = textContent.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Chunk text into manageable pieces (500 words each)
  const chunks = chunkArray(words, 500).map(chunk => chunk.join(' '));

  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      data: { message: 'Processing metadata...' }
    });
  }

  const result: PDFProcessingResult = {
    pageCount: data.numpages,
    textContent: textContent.slice(0, 10000), // First 10000 chars
    wordCount,
    metadata: {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      creationDate: data.info?.CreationDate,
    },
    chunks: chunks.slice(0, 20), // First 20 chunks
  };

  return result;
}

// Main worker execution
if (parentPort) {
  const { filePath } = workerData as WorkerData;

  processPDF(filePath)
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