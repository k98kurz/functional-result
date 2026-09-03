// @docs: readme.md
const sometimesThrows = (): unknown => {
  throw new Error('boom');
};
// @snippet-start
import { tryCatchSync } from '@k98kurz/functional-result';

// Wrap synchronous operations (no await needed)
const syncResult = tryCatchSync(() => {
  const data = JSON.parse('{"valid": true}');
  return data.valid;
});
// { success: true, data: true }

// Transform errors for better context
const result = tryCatchSync(
  () => sometimesThrows(),
  (error) => `Operation failed: ${error instanceof Error ? error.message : String(error)}`
);
// @snippet-end