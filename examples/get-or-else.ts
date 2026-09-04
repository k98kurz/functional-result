// @docs: readme.md, src/SKILL.md
import { success, failure } from '@k98kurz/functional-result';
// @snippet-start
import { getOrElse } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

const successResult = success(42);
const value = getOrElse(0)(successResult);
// 42

const failureResult = failure('error');
const fallback = getOrElse(0)(failureResult);
// 0

// defaults need not match the success type exactly (returns T | D):
const maybeNullableResult: Result<string | null, Error> = success('x');
const maybeNull = getOrElse(null)(maybeNullableResult); // string | null
// @snippet-end
