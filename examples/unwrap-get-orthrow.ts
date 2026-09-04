// @docs: readme.md
// @snippet-start
import { unwrapResult, getOrThrow, success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

const someFunctionReturnsResult = (): Result<number, Error> => success(1);

// Convert Result-based code to use standard try-catch
const result = someFunctionReturnsResult();
const data = unwrapResult(result); // throws if not success

// Or use the alias
const data2 = getOrThrow(result);
// @snippet-end
