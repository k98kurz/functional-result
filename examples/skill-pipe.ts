// @docs: src/SKILL.md
// @snippet-start
import { pipe, map, chain, success, failure } from '@k98kurz/functional-result';

const processInput = await pipe(
  success('  5  '),
  map(s => s.trim()),
  map(s => parseInt(s, 10)),
  chain(n => isNaN(n) ? failure('Invalid number') : success(n)),
  map(n => n * 2)
);
// Returns: success(10)

const processInvalid = await pipe(
  success('abc'),
  map(s => s.trim()),
  map(s => parseInt(s, 10)),
  chain(n => isNaN(n) ? failure('Invalid number') : success(n)),
  map(n => n * 2)
);
// Returns: failure('Invalid number')
// @snippet-end