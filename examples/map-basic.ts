// @docs: readme.md
import { success, failure } from '@k98kurz/functional-result';
// @snippet-start
import { map } from '@k98kurz/functional-result';

const result = success(5);
const doubled = map(x => x * 2)(result);
// { success: true, data: 10 }

const failed = failure('error');
const unchanged = map(x => x * 2)(failed);
// { success: false, error: 'error' } - failures pass through unchanged
// @snippet-end