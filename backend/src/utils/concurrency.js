// Runs `worker` over `items` with at most `limit` in flight at once — a small
// worker-pool instead of pulling in p-limit for something this simple.
export const runWithConcurrencyLimit = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await worker(items[current], current);
    }
  });

  await Promise.all(runners);
  return results;
};
