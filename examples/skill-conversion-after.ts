// @docs: src/SKILL.md
import type { Result } from '@k98kurz/functional-result';
type User = { id: number; name: string };
type Post = { id: number; userId: number };
const db = {
  find(id: number): User | undefined {
    return undefined;
  },
  posts: [] as Post[],
};
const handleError = (error: unknown): unknown => error;
// @snippet-start
import { pipe, chain, match, success, failure } from '@k98kurz/functional-result';

function getUser(id: number): Result<User, string> {
  const user = db.find(id);
  return user ? success(user) : failure('User not found');
}

function getPosts(user: User): Result<Post[], string> {
  return success(db.posts.filter(p => p.userId === user.id));
}

async function somePipeline() {
  const result = await pipe(
    success(1),
    chain(getUser),
    chain(getPosts)
  );

  return match(
    (posts) => posts,
    (error) => handleError(error)
  )(result);
}
// @snippet-end