// @docs: readme.md
import { map, pipe, success } from '@k98kurz/functional-result';
// @snippet-start
const ops = [
  map((x: number) => x * 2),
  map((x: number) => x + 1),
];

const result = await pipe.untyped(success(5), ...ops);
// { success: true, data: 11 }
// @snippet-end