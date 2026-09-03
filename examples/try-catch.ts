// @docs: readme.md
const sometimesThrows = (): unknown => {
  throw new Error('boom');
};
// @snippet-start
import { tryCatch } from '@k98kurz/functional-result';

// Wrap synchronous operations
const syncResult = await tryCatch(() => {
  const data = JSON.parse('{"valid": true}');
  return data.valid;
});
// { success: true, data: true }

// Wrap asynchronous operations
const asyncResult = await tryCatch(async () => {
  const response = await fetch('https://api.example.com');
  return response.json();
});
// Result depends on fetch success/failure

// Transform errors for better context
const result = await tryCatch(
  () => sometimesThrows(),
  (error) => `Operation failed: ${error instanceof Error ? error.message : String(error)}`
);
// @snippet-end