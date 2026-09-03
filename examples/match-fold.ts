// @docs: readme.md, src/SKILL.md
// @snippet-start
import { match, fold, success } from '@k98kurz/functional-result';

const result = success(42);

const message = match(
  (data: number) => `Success! Got: ${data}`,
  (error: unknown) => `Failed with: ${error}`
)(result);
// 'Success! Got: 42'

// fold is an alias for match with more semantic meaning for final value extraction
const finalValue = fold(
  (data: number) => data.toString(),
  (error: unknown) => 'default value'
)(result);
// '42'
// @snippet-end
