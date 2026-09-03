// @docs: src/SKILL.md
import { success } from '@k98kurz/functional-result';
// @snippet-start
import { match, fold } from '@k98kurz/functional-result';

const result = success(42);

const message = match(
  (data: number) => `Success! Got: ${data}`,
  (error: unknown) => `Failed with: ${error}`
)(result);

const finalValue = fold(
  (data: number) => data.toString(),
  (error: unknown) => 'default value'
)(result);
// @snippet-end