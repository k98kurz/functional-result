// @docs: readme.md, src/SKILL.md
// @snippet-start
import { mapError, unwrapResult, success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type CustomError = { message: string; stack?: string };
const someFunctionReturnsResult = (): Result<string, CustomError> =>
  success('x');

const result = someFunctionReturnsResult();
const ensureError = mapError((err: CustomError) => {
  const error = new Error(err.message);
  if (err.stack) error.stack = err.stack;
  return error;
});
const data = unwrapResult(ensureError(result));
// @snippet-end
