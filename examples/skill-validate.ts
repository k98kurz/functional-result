// @docs: src/SKILL.md
// @snippet-start
import { validate, type ValidationError } from '@k98kurz/functional-result';

const emailValidator = validate([
  (value: string) =>
    value.includes('@') ? null : { field: 'email', message: 'Must contain @' },
  (value: string) =>
    value.length >= 3 ? null : { field: 'email', message: 'Too short' }
]);

const valid = emailValidator('test@example.com');
// success('test@example.com')

const invalid = emailValidator('ab');
// failure([
//   { field: 'email', message: 'Must contain @' },
//   { field: 'email', message: 'Too short' }
// ])
// @snippet-end