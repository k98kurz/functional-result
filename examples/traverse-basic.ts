// @docs: readme.md, src/SKILL.md
import { failure, success } from '@k98kurz/functional-result';
// @snippet-start
import { traverse } from '@k98kurz/functional-result';

const items = ['1', '2', '3'];
const result = traverse((x: string) => {
  const num = Number(x);
  return isNaN(num) ? failure('Invalid') : success(num * 2);
})(items);
// { success: true, data: [2, 4, 6] }
// @snippet-end
