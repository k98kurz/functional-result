// @docs: readme.md
import { success, failure } from '@k98kurz/functional-result';
// @snippet-start
import { getOrElse } from '@k98kurz/functional-result';

const successResult = success(42);
const value = getOrElse(0)(successResult);
// 42

const failureResult = failure('error');
const fallback = getOrElse(0)(failureResult);
// 0
// @snippet-end