// @docs: readme.md, src/SKILL.md
// @snippet-start
import { success, failure } from '@k98kurz/functional-result';

// Create a successful result
const successful = success(42);
// { success: true, data: 42 }

// Create a failed result
const failed = failure('Something went wrong');
// { success: false, error: 'Something went wrong' }
// @snippet-end
