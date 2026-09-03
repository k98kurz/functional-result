// @docs: src/SKILL.md
// @snippet-start
import { tap, tapError, pipe, map, success, failure } from '@k98kurz/functional-result';

const logSuccess = tap((data) => console.log('Success:', data));
const logFailure = tapError((err) => console.error(err));

const result = await pipe(
  success('  hello  '),
  logSuccess,                   // logs "Success:   hello  "
  logFailure,                   // does nothing
  map(s => s.trim().toUpperCase()),
  logSuccess                    // logs "Success: HELLO"
);

const failed = await pipe(
  failure('db timeout'),
  logSuccess,                   // does nothing
  logFailure                    // logs "db timeout"
);
// @snippet-end