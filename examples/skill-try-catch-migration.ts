// @docs: src/SKILL.md
// @snippet-start
import { tryCatch, tryCatchSync } from '@k98kurz/functional-result';

// Wrap both async and sync operations with tryCatch
const fetchData = async () =>
  await tryCatch(async () => {
    const response = await fetch('https://api.example.com');
    return response.json();
  });

const parseJson = async (json: string) =>
  await tryCatch(() => JSON.parse(json));

// Wrap sync operations with tryCatchSync (returns Result directly, no await)
const parseJsonSync = (json: string) =>
  tryCatchSync(() => JSON.parse(json));

// Provide a transformer for richer error context
const safeParse = (json: string) =>
  tryCatchSync(
    () => JSON.parse(json),
    (error) => ({
      type: 'parse_error',
      message: error instanceof Error ? error.message : String(error),
      input: json
    })
  );
// @snippet-end