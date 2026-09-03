// @docs: readme.md
// @snippet-start
import { chain, failure, mapError, success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type ParseError = { code: string };
type ApiError = { code: string; message: string };

const parse = (input: string): Result<number, ParseError> => {
  const n = Number(input);
  return isNaN(n) ? failure({ code: 'parse' }) : success(n);
};

const checkRange = (n: number): Result<number, ApiError> =>
  n > 100 ? failure({ code: 'range', message: `${n} is out of range` }) : success(n);

// a synchronous multi-step flow, with a typed error channel throughout
const toApiError = (e: ParseError): ApiError => ({ code: e.code, message: 'Invalid input' });

const processInput = (input: string): Result<number, ApiError> =>
  chain(checkRange)(mapError(toApiError)(parse(input)));

const result = processInput('21'); // { success: true, data: 21 }
// @snippet-end