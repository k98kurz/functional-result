// @docs: readme.md
// @snippet-start
import { validate } from '@k98kurz/functional-result';

const emailValidator = validate([
  (value: string) =>
    value.includes('@') ? null : { field: 'email', message: 'Must contain @' },
  (value: string) =>
    value.length >= 3 ? null : { field: 'email', message: 'Too short' }
]);

const valid = emailValidator('test@example.com');
// { success: true, data: 'test@example.com' }

const invalid = emailValidator('ab');
// { success: false, error: [
//   { field: 'email', message: 'Must contain @' },
//   { field: 'email', message: 'Too short' }
// ]}
// @snippet-end