// @docs: readme.md, src/SKILL.md
// @snippet-start
import {
  tap, tapError, pipe, map, success, failure
} from '@k98kurz/functional-result';

const logSuccess = tap((data: string) => console.log('Success:', data));
const logFailure = tapError((err: string) => console.error(err));

const result = await pipe(
  success('  hello  '),
  logSuccess,   // logs "Success:   hello  " — result passes through
  logFailure,   // does nothing
  map(s => s.trim().toUpperCase()),
  logSuccess    // logs "Success: HELLO"
);

// Failures skip success taps and run error taps
const failed = await pipe(
  failure('db timeout'),
  logSuccess,   // does nothing
  logFailure    // logs "db timeout"
);
// @snippet-end
