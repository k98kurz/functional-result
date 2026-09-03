// @docs: readme.md
import { pipe, success, map } from '@k98kurz/functional-result';
// @snippet-start
import { tap, tapError } from '@k98kurz/functional-result';

const logResult = tap((data) => console.log('Success:', data));
const logFailure = tapError((err) => console.error('Failure:', err));

const result = await pipe(
  success(42),
  logResult,   // logs "Success: 42" — result passes through
  map(x => x * 2)
);
// final result is still success(84)
// @snippet-end