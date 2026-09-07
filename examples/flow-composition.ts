// @docs: readme.md, src/references/composition.md
// @snippet-start
import {
  chain,
  failure,
  flow,
  map,
  success,
} from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';

type User = { id: number; email: string };
type ApiError = { code: string; message: string };

const sendEmail = (email: string): Result<boolean, ApiError> =>
  email.includes('@')
    ? success(true)
    : failure({ code: 'email', message: 'invalid email' });

const processUser = flow(
  map((u: User) => u.email),
  chain(sendEmail),
  async <E>(r: Result<boolean, E>) =>
    r.success ? success('sent') : r
);

const userA = success({ id: 1, email: 'a@example.com' } as User);
const userB = success({ id: 2, email: 'no-at.example.com' } as User);

const a = await processUser(userA); // { success: true, data: 'sent' }
const b = await processUser(userB);
// { success: false, error: { code: 'email', message: 'invalid email' } }
// @snippet-end