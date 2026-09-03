// @docs: src/SKILL.md
// @snippet-start
import { success, failure } from '@k98kurz/functional-result';

// Success with data
const result = success(42);

// Failure with error
const result = failure('Database connection failed');
// @snippet-end