// @docs: readme.md
import { pipe, success, failure } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';
// @snippet-start
import { map, chain } from '@k98kurz/functional-result';

type User = { id: number; name: string };
type ApiError = { code: string; message: string };

const processUser = (user: User): Promise<Result<string, ApiError>> => {
  return pipe(
    success(user),
    map(u => ({ ...u, email: `${u.name}@example.com` })),
    chain(u => u.id > 0
      ? success(JSON.stringify(u))
      : failure({ code: 'INVALID', message: 'Invalid ID' }))
  );
};
// @snippet-end
