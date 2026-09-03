// @docs: readme.md, src/SKILL.md
import { success, failure } from '@k98kurz/functional-result';
// @snippet-start
import { map } from '@k98kurz/functional-result';

const result = success('  hello  ');
const trimmed = map((s: string) => s.trim())(result);
// { success: true, data: 'hello' }

// Failures pass through unchanged
const failed = failure('error');
const unchanged = map((s: string) => s.trim())(failed);
// { success: false, error: 'error' }
// @snippet-end
