/**
 * Batch Processing Utility
 * Efficiently processes large datasets in chunks to avoid blocking the event loop
 */

export interface BatchOptions {
  batchSize?: number;      // Number of items to process per batch (default: 1000)
  delayBetweenBatches?: number; // Milliseconds to wait between batches (default: 0)
  onProgress?: (processed: number, total: number) => void; // Progress callback
}

export interface BatchResult<T> {
  data: T[];
  errors: Array<{ index: number; error: string }>;
  processedCount: number;
  totalCount: number;
}

/**
 * Process an array in batches with optional delay between batches
 * This prevents blocking the event loop for large datasets
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => R,
  options: BatchOptions = {}
): Promise<R[]> {
  const {
    batchSize = 1000,
    delayBetweenBatches = 0,
    onProgress,
  } = options;

  const results: R[] = [];
  const totalItems = items.length;

  for (let i = 0; i < totalItems; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, totalItems));

    // Process batch
    for (let j = 0; j < batch.length; j++) {
      const globalIndex = i + j;
      results.push(processor(batch[j], globalIndex));
    }

    // Report progress
    const processed = Math.min(i + batchSize, totalItems);
    if (onProgress) {
      onProgress(processed, totalItems);
    }

    // Yield to event loop between batches
    if (delayBetweenBatches > 0 && i + batchSize < totalItems) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    } else if (i + batchSize < totalItems) {
      // Even with no delay, yield to event loop
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  return results;
}

/**
 * Process an array in batches with validation
 * Collects both successful results and errors
 */
export async function processBatchWithValidation<T, R>(
  items: T[],
  validator: (item: T, index: number) => { success: true; data: R } | { success: false; error: string },
  options: BatchOptions = {}
): Promise<BatchResult<R>> {
  const {
    batchSize = 1000,
    delayBetweenBatches = 0,
    onProgress,
  } = options;

  const data: R[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  const totalItems = items.length;

  for (let i = 0; i < totalItems; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, totalItems));

    // Process batch
    for (let j = 0; j < batch.length; j++) {
      const globalIndex = i + j;
      const result = validator(batch[j], globalIndex);

      if (result.success) {
        data.push(result.data);
      } else {
        errors.push({ index: globalIndex, error: result.error });
      }
    }

    // Report progress
    const processed = Math.min(i + batchSize, totalItems);
    if (onProgress) {
      onProgress(processed, totalItems);
    }

    // Yield to event loop between batches
    if (delayBetweenBatches > 0 && i + batchSize < totalItems) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    } else if (i + batchSize < totalItems) {
      // Even with no delay, yield to event loop
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  return {
    data,
    errors,
    processedCount: totalItems,
    totalCount: totalItems,
  };
}

/**
 * Chunk an array into smaller arrays
 * Useful for parallel processing or memory-efficient operations
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Process in parallel batches (for CPU-intensive operations)
 * Processes multiple batches simultaneously up to maxConcurrency
 */
export async function processParallelBatches<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions & { maxConcurrency?: number } = {}
): Promise<R[]> {
  const {
    batchSize = 1000,
    maxConcurrency = 3,
    onProgress,
  } = options;

  const chunks = chunkArray(items, batchSize);
  const results: R[] = new Array(items.length);

  let completedBatches = 0;
  const totalBatches = chunks.length;

  // Process chunks with concurrency limit
  for (let i = 0; i < chunks.length; i += maxConcurrency) {
    const batchGroup = chunks.slice(i, Math.min(i + maxConcurrency, chunks.length));
    const batchStartIndices = batchGroup.map((_, idx) => (i + idx) * batchSize);

    await Promise.all(
      batchGroup.map(async (chunk, groupIdx) => {
        const startIndex = batchStartIndices[groupIdx];

        for (let j = 0; j < chunk.length; j++) {
          const globalIndex = startIndex + j;
          results[globalIndex] = await processor(chunk[j], globalIndex);
        }

        completedBatches++;
        if (onProgress) {
          const processedItems = Math.min(completedBatches * batchSize, items.length);
          onProgress(processedItems, items.length);
        }
      })
    );
  }

  return results;
}

/**
 * Estimate optimal batch size based on dataset size
 */
export function calculateOptimalBatchSize(totalItems: number): number {
  if (totalItems < 100) return totalItems; // Process all at once
  if (totalItems < 1000) return 100;
  if (totalItems < 10000) return 500;
  if (totalItems < 100000) return 1000;
  return 2000; // Max batch size for very large datasets
}

/**
 * Check if batching is recommended for dataset size
 */
export function shouldUseBatching(totalItems: number, threshold: number = 1000): boolean {
  return totalItems >= threshold;
}
