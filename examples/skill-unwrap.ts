// @docs: src/SKILL.md
import { success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';
type Request = { params: { id: string } };
type Response = { json: (v: unknown) => void };
type Handler = (req: Request, res: Response) => void | Promise<void>;
const getUser = (id: number): Result<{ name: string }, Error> =>
  success({ name: 'x' });
const app = {
  get(_path: string, handler: Handler): void {}
};
// @snippet-start
import { unwrapResult } from '@k98kurz/functional-result';

const someFunctionReturnsResult = (): Result<number, Error> => success(1);
const result = someFunctionReturnsResult();

// Throws if result is a failure
const data = unwrapResult(result);

// Use case: integrating with exception-based frameworks
app.get('/users/:id', async (req, res) => {
  const userResult = await getUser(Number(req.params.id));
  const user = unwrapResult(userResult); // throws if not found
  res.json(user);
});
// @snippet-end
