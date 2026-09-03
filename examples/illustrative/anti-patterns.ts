// @docs: src/SKILL.md
// @no-compile
// @snippet-start
// DON'T: Use map for operations that return Results
const bad = map(x => success(x * 2))(result); // Returns Result<Result<number, E>, E>

// DO: Use chain for operations that return Results
const good = chain(x => success(x * 2))(result); // Returns Result<number, E>

// DON'T: Forget that pipe is async
const bad = pipe(success(1), map(x => x * 2)); // Returns Promise, not Result
const value = bad.data; // Error: value is Promise, not Result

// DO: Await the pipe result
const good = await pipe(success(1), map(x => x * 2));
const value = good.data; // Correct

// DON'T: Use unwrapResult without try-catch
const bad = unwrapResult(mayFail()); // Could throw

// DO: Handle errors appropriately
try {
  const good = unwrapResult(mayFail());
} catch (error) {
  handleError(error);
}
// @snippet-end