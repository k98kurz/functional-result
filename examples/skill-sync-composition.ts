// @docs: src/SKILL.md
// @snippet-start
import { chain, failure, mapError, success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type ParseError = { code: string };
type ApiError = { code: string; message: string };

const parse = (s: string): Result<number, ParseError> =>
  isNaN(Number(s)) ? failure({ code: 'parse' }) : success(Number(s));

const checkRange = (n: number): Result<number, ApiError> =>
  n > 100 ? failure({ code: 'range', message: 'out of range' }) : success(n);

const toApiError = (e: ParseError): ApiError => ({ code: e.code, message: 'invalid' });

const process = (s: string): Result<number, ApiError> =>
  chain(checkRange)(mapError(toApiError)(parse(s)));
// @snippet-end