// @docs: src/SKILL.md
import { success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';
const processItem = (item: string): Result<number, Error> => success(item.length);
// @snippet-start
import { traverse, partitionResults } from '@k98kurz/functional-result';

const processBatch = async (items: string[]) => {
  // Try to process all items
  const results = traverse(processItem)(items);

  // Collect successes and failures separately
  const { successes, failures } = partitionResults(results);

  // Report results
  return {
    succeeded: successes.length,
    failed: failures.length,
    errors: failures,
    data: successes
  };
};
// @snippet-end