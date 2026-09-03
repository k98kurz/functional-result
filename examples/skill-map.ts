// @docs: src/SKILL.md
import { success, failure } from '@k98kurz/functional-result';
// @snippet-start
import { map } from '@k98kurz/functional-result';

const result = success('  hello  ');
const trimmed = map(s => s.trim())(result); // success('hello')

// Failures pass through unchanged
const failed = failure('error');
const unchanged = map(s => s.trim())(failed); // still failure('error')
// @snippet-end