// @docs: src/SKILL.md
import { success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';
const processItem = (item: string): Result<number, Error> => success(item.length);
// @snippet-start
import { partitionResults } from '@k98kurz/functional-result';

const processBatch = (items: string[]) => {
  // Map each item to a Result
  const outcomes = items.map(processItem);

  // Collect successes and failures separately
  const { successes, failures } = partitionResults(outcomes);

  // Report results
  return {
    succeeded: successes.length,
    failed: failures.length,
    errors: failures,
    data: successes
  };
};
// @snippet-end
