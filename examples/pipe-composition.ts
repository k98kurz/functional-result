// @docs: readme.md
import { success, failure } from '@k98kurz/functional-result';
// @snippet-start
import { pipe, map, chain } from '@k98kurz/functional-result';

const processInput = await pipe(
  success('5'),
  map(s => s.trim()),
  map(s => parseInt(s, 10)),
  chain(n => isNaN(n) ? failure('Invalid number') : success(n)),
  map(n => n * 2)
);
// Result: { success: true, data: 10 }

// If any operation fails, subsequent operations are skipped
const processInvalid = await pipe(
  success('abc'),
  map(s => s.trim()),
  map(s => parseInt(s, 10)),
  chain(n => isNaN(n) ? failure('Invalid number') : success(n)),
  map(n => n * 2)
);
// Result: { success: false, error: 'Invalid number' }
// @snippet-end