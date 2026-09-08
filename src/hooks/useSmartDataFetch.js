const CHUNK_SIZE = 300; // Process ~300 items per frame; fewer yields = faster completion

/**
 * Process array in chunks, yielding to main thread between chunks.
 * Prevents blocking UI on large datasets (low-end devices).
 */
export function processInChunks(items, processor) {
    return new Promise((resolve) => {
        if (!items || items.length === 0) {
            resolve([]);
            return;
        }
        const result = [];
        let i = 0;

        function runChunk() {
            const end = Math.min(i + CHUNK_SIZE, items.length);
            for (; i < end; i++) {
                try {
                    result.push(processor(items[i]));
                } catch (e) {
                    console.warn('Chunk processor error at index', i, e);
                }
            }
            if (i >= items.length) {
                resolve(result);
            } else {
                setTimeout(runChunk, 0);
            }
        }
        runChunk();
    });
}

/**
 * Parallel fetch multiple URLs. Returns array of results in same order.
 */
export async function parallelFetch(urlsWithKeys, fetchFn) {
    const promises = urlsWithKeys.map(({ url }) => fetchFn(url));
    return Promise.all(promises);
}
