// @docs: readme.md
import { map, pipe, success } from '@k98kurz/functional-result';
// @snippet-start
const double = map((x: number) => x * 2);
const toString = map((x: number) => x.toString());

const result = await pipe(
  success(5),
  double,
  toString
);
// { success: true, data: '10' }
// @snippet-end