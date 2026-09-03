// @docs: readme.md
import { success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';
const someFunctionReturnsResult = (): Result<number, Error> => success(1);
// @snippet-start
import { tryCatch, unwrapResult, getOrThrow } from '@k98kurz/functional-result';

// Convert Result-based code to use standard try-catch
const result = await someFunctionReturnsResult();
const data = unwrapResult(result); // throws if not success

// Or use the alias
const data2 = getOrThrow(result);
// @snippet-end