import { parentPort, workerData } from 'worker_threads';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import { CSVProcessingResult, ColumnStatistics } from '../../types/file.types';
import { calculateMedian, calculateStdDev } from '../../utils/helpers';

interface WorkerData {
  filePath: string;
}

async function processCSV(filePath: string): Promise<CSVProcessingResult> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    const columnStats: Map<string, any[]> = new Map();
    let columns: string[] = [];

    createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headers: string[]) => {
        columns = headers;
        headers.forEach(header => columnStats.set(header, []));
      })
      .on('data', (row: any) => {
        rows.push(row);
        
        // Collect data for statistics
        columns.forEach(col => {
          const value = row[col];
          if (value !== null && value !== undefined && value !== '') {
            columnStats.get(col)?.push(value);
          }
        });

        // Send progress update
        if (rows.length % 1000 === 0 && parentPort) {
          parentPort.postMessage({
            type: 'progress',
            data: { message: `Processed ${rows.length} rows` }
          });
        }
      })
      .on('end', () => {
        // Calculate statistics for each column
        const statistics: Record<string, ColumnStatistics> = {};
        
        columns.forEach(col => {
          const values = columnStats.get(col) || [];
          const numericValues = values
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v));
          
          const isNumeric = numericValues.length > values.length * 0.8;
          
          if (isNumeric && numericValues.length > 0) {
            const sum = numericValues.reduce((a, b) => a + b, 0);
            const mean = sum / numericValues.length;
            
            statistics[col] = {
              type: 'numeric',
              count: values.length,
              nullCount: rows.length - values.length,
              uniqueCount: new Set(values).size,
              mean,
              median: calculateMedian(numericValues),
              min: Math.min(...numericValues),
              max: Math.max(...numericValues),
              stdDev: calculateStdDev(numericValues, mean),
            };
          } else {
            statistics[col] = {
              type: 'string',
              count: values.length,
              nullCount: rows.length - values.length,
              uniqueCount: new Set(values).size,
              min: values.length > 0 ? values[0] : undefined,
              max: values.length > 0 ? values[values.length - 1] : undefined,
            };
          }
        });

        // Detect duplicates
        const rowStrings = rows.map(r => JSON.stringify(r));
        const uniqueRows = new Set(rowStrings);
        const duplicateCount = rows.length - uniqueRows.size;

        const result: CSVProcessingResult = {
          rowCount: rows.length,
          columnCount: columns.length,
          columns,
          statistics,
          duplicateCount,
          preview: rows.slice(0, 10), // First 10 rows
        };

        resolve(result);
      })
      .on('error', reject);
  });
}

// Main worker execution
if (parentPort) {
  const { filePath } = workerData as WorkerData;

  processCSV(filePath)
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
