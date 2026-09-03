// @docs: src/SKILL.md
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
function getUser(id: number): User {
  const user = db.find(id);
  if (!user) throw new Error('User not found');
  return user;
}

function getPosts(user: User): Post[] {
  return db.posts.filter(p => p.userId === user.id);
}

function getUserPosts(id: number): Post[] | undefined {
  try {
    const user = getUser(id);
    const posts = getPosts(user);
    return posts;
  } catch (error) {
    handleError(error);
  }
}
// @snippet-end
