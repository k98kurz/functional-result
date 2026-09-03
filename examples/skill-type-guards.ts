// @docs: src/SKILL.md
import { success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';
// @snippet-start
import { isSuccess, isFailure } from '@k98kurz/functional-result';

const result: Result<string, number> = success('test');

if (isSuccess(result)) {
  // TypeScript knows result.data is a string here
  console.log(result.data.toUpperCase());
} else {
  // TypeScript knows result.error is a number here
  console.log(`Error code: ${result.error}`);
}

// isFailure is the inverse
if (isFailure(result)) {
  console.log(`Error: ${result.error}`);
}
// @snippet-end