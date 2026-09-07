// @docs: readme.md, src/SKILL.md
// @snippet-start
import {
  chain,
  failure,
  flowSync,
  map,
  success,
} from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type Input = { value: number };
type ApiError = { code: string; message: string };

const checkRange = (n: number): Result<number, ApiError> =>
  n > 100
    ? failure({ code: 'range', message: `${n} is out of range` })
    : success(n);

const processInput = flowSync(
  map((i: Input) => i.value),
  chain(checkRange)
);

const resultA = processInput(success({ value: 42 } as Input));
const resultB = processInput(success({ value: 200 } as Input));
// @snippet-end