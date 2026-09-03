// @docs: src/SKILL.md
import type { Result } from '@k98kurz/functional-result';
// @snippet-start
import { tryCatch, map } from '@k98kurz/functional-result';

const fetchApi = async <T>(url: string): Promise<Result<T, string>> => {
  return await tryCatch(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json() as T;
    },
    (error) => `API request failed: ${error instanceof Error ? error.message : String(error)}`
  );
};
// @snippet-end