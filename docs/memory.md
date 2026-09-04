# Memory

## Example code is a single source of truth, verified in CI

**Decision (2026-09-03, consolidated same day):** Every TypeScript snippet
embedded in `readme.md` and `src/SKILL.md` lives verbatim in `examples/<id>.ts`
(the `id` matches a `<!-- example: <id> -->` sentinel placed immediately above
the doc fence). `scripts/check-examples.mjs` enforces the contract;
`npm run check:examples` runs `tsc -p tsconfig.examples.json` first, then the
checker. Both are wired into `prepublishOnly` and `checklist.sh`.

**One snippet, many docs:** where readme and SKILL showed near-identical
snippets, they were merged into ONE file whose `@docs:` header lists both docs;
both fences carry the same id and byte-identical content. The `skill-` prefix
survives only on SKILL-only standalones; shared examples use the plain id. To
change a doc snippet, edit the region in the example `.ts` file first, then run
`npm run sync:examples` to propagate it into the fences. `npm run
check:examples` fails on any drift and remains the CI gate.

**Script ownership (2026-09-04):** `scripts/check-examples.mjs` is strictly
read-only — no write capability whether run directly or imported (exports
`analyzeExamples`/`printFindings`, paths injectable for tests).
`scripts/sync-examples.mjs` owns every write: it repairs MISMATCH findings
only (examples are canonical, direction examples -> docs) and fails on
structural contract violations. The contract is pinned by
`test/scripts-examples.test.mjs` (fixtures under gitignored `temp/`). Do not
add repair logic or a fix flag back into the checker — the read/write split
is deliberate.

**Example file format:** a `// @docs: <doc>[, <doc>...]` header listing
registered locations, then one snippet region delimited by `// @snippet-start` /
`// @snippet-end`. Scaffold (stub types/helpers the snippet references, plus any
imports the snippet uses but didn't declare) lives OUTSIDE the region so the
doc text stays verbatim. Imports use the package name verbatim;
`tsconfig.examples.json` maps `@k98kurz/functional-result` to
`./src/functional-result` so examples compile as-is. Base config's
`module: ES2022` permits top-level `await`; `noUnusedLocals` is off.
`examples/illustrative/` holds intentionally non-compiling fragments, marked
`// @no-compile`, excluded from tsc and eslint but still text-checked.

**Snippet conventions:** comments show serialized result shapes
(`// { success: true, data: 10 }`); prefer the richer variant when
deduplicating snippets (keep failure-path demos); all doc snippets compile
strictly — annotate curried callbacks at partial application
(`map((s: string) => ...)`), never feed a `traverse` Result (single Result) to
`partitionResults` (array of Results — use `items.map(fn)`), and wrap
imperative fragments in a function instead of top-level `try`/`return`. Keep
every line ≤ 85 chars (`max-len` covers `examples/**`); prettier deliberately
does NOT cover `examples/` (reformatting would desync verbatim regions).

## Curried functions: split generics for every channel across applications

**Gotcha (2026-09-02; success-channel gap found 2026-09-03):** A generic on a
curried function binds at the first call; a generic with no inference site
there silently falls back to `unknown`. The first pass fixed the *error*
channel: composing distinct error types hard-errored (TS2345), and
`map`/`tap` — whose callbacks never mention `E` — collapsed the error channel
to `unknown`. It missed the *success* channel: `mapError`/`tapError` carried
`T` only on the second (Result) parameter, so `mapError(handler)` applied to
a `Result<number, E>` returned `Result<unknown, F>` — silently, since
`Result<number, E>` is assignable to `Result<unknown, E>` — and
`tapError(e => log(e))(r)` collapsed **both** channels to `unknown`.

**Solution:** every generic is inferred on the application that supplies it —
callback-introduced types on the outer call, Result-supplied types on the
inner:
- `chain` → `<T, U, F>(fn) => <E>(result): Result<U, E | F>` (`F` = errors
  `fn` introduces; the union keeps error-widening usable in `pipe`, whose
  overloads carry one `E` through the chain)
- `map` → `<T, U>(fn) => <E>(result)` and `tap` → `<T>(fn) => <E>(result)`
  (callbacks mention only success types)
- `mapError` → `<E, F>(fn) => <T>(result): Result<T, F>` (`T` moves inner)
- `tapError` → `<F>(fn) => <T, E extends F>(result): Result<T, E>` (`F` =
  errors the handler accepts; `E extends F` preserves the actual error type
  while keeping a narrow-handler-on-wider-union a type error)
- `getOrElse` → `<D>(d) => <T, E>(result): T | D` (default need not equal `T`)
- `success` defaults `E = never` so a bare `success(x)` doesn't widen the
  union; `sequence`/`traverse` accept `readonly` arrays

**Lesson:** the runtime test suite cannot detect type degradation — a
collapsed `Result<unknown, unknown>` still compiles and runs. Type-level
`Equal`/`Expect` assertions and `@ts-expect-error` safety guards must live in
`test/` (covered by `tsconfig.test.json`, run by `npm run typecheck`), NOT in
gitignored `temp/` probes that CI never executes. Verify emitted JS is
unchanged for type-only fixes. Curried callbacks whose params mention a
generic (`traverse`, `match`, `fold`) can't defer that generic — the
callback's parameter must be annotated by the user (docs say so); dual-arity
overloads were considered and rejected in favor of documenting the
annotation requirement.

## Union-parameter inference in `tryCatch`

**Gotcha (2026-09-02):** `tryCatch`'s original union parameter
`(() => T) | (() => Promise<T>)` bound `T = Promise<X>` for promise-returning
thunks (TypeScript breaks inference ties toward the first union constituent),
typing `.data` as a `Promise` while the runtime correctly awaited to `X`. It
survived unnoticed because tests were then excluded from type checking (see
"tsconfig scope and typecheck" below) and Vitest doesn't typecheck.

**Solution:** Ordered overloads with the async signature first — overload
resolution is a documented first-match-wins rule, unlike union inference
tie-breaking. When touching public generics, verify signatures with a
throwaway type-level probe run with explicit-file `tsc` flags
(`tsconfig.json` only includes `src`). Consider `Awaited<T>` if a signature
ever needs to normalize promise-or-value returns by construction.

## Read tool truncates large windows in long source files

**Gotcha (2026-08-15):** The agent's file-read tool silently truncates large
windows when reading deep into long files — e.g., reading
`src/functional-result.ts` (512 lines) at `offset 360, limit 160` consistently
stopped at line 401, below the requested range. This caused many repeated
failed attempts to inspect the `pipe` implementation (~lines 474–486).

**Solution:** When reading past ~line 400 of any long file in this repo
(`src/functional-result.ts`, `src/SKILL.md`, both 500+ lines), request small
windows (`limit` ≤ 50). Grep for line numbers first, then read the narrow span
around them.

## tsconfig scope and typecheck

**Decision (revised 2026-09-02):** Tests are type-checked. `tsconfig.json`
covers `src` only; `tsconfig.test.json` covers `test/**/*.ts`; `npm run
typecheck` runs both. Reversed from the v0.0.1 exclusion after the unchecked
`tryCatch` inference bug (entry above) survived unnoticed — Vitest transpiles
without `tsc`.

**Test narrowing conventions:**
- Success paths: `expect(unwrapResult(result)).toBe(...)` — a test-local helper
  (`if (!isSuccess(r)) throw ...; return r.data`) in `functional-result.test.ts`.
- Failure paths: `expect(isFailure(result)).toBe(true);` then
  `if (!isFailure(result)) return;` before reading `result.error`. The assertion
  records intent; the guard drives control-flow narrowing for the type checker.

## JSDoc checker Node version compatibility

**Decision (v0.0.1):** `scripts/check-jsdoc-lines.mjs` uses a recursive
directory walk (`readdirSync` + `statSync`) instead of `fs.globSync` to
support the declared `engines >= 18` requirement. `fs.globSync` was added in
Node 22.

## Test tag convention (v0.0.1)

**Decision:** Adopted single-letter test tags to identify which block a test
belongs to. Tags like `[P05]` are the stable anchor for locating tests in
error messages, bug reports, and CI output even as test names or `describe`
blocks are renamed.

### The scheme

| Block | Prefix | Tag range | Note |
|-------|--------|-----------|------|
| Constructors & Type Guards | **B** | B01–B06 | **B**asics — fundamental building blocks |
| Error Handling | **E** | E01–E09 | — |
| Transformations | **T** | T01–T07 | — |
| Composition | **P** | P01–P09 | **P**ipe is the headline feature of this block |
| Collections | **L** | L01–L08 | **L**ists / coL**L**ections |
| Validation | **V** | V01–V02 | — |
| Accessors | **A** | A01–A02 | `getOrElse`, `getOrThrow` — renamed from "Extraction" |
| Edge Cases | **X** | X01–X04 | **X** for eXtreme / eXceptional |
| Skill Export | **S** | S01–S07 | **S**kill export CLI tests |
| Examples Scripts | **C** | C01–C11 | **C**heck/sync contract tests |

## JSDoc formatting conventions

**Decision:** JSDoc lines should wrap at 80 characters (soft limit) and must not
exceed 85 characters (hard limit).

### Rules

- **Continuation indentation:** When `@param`, `@returns`, or other tag descriptions
  wrap to a new line, indent that line **1 extra space** after `* `.
- **No trailing periods:** Tag descriptions (`@param`, `@returns`, `@template`) are
  capitalized sentence fragments with no final `.`.
- **Code references:** Property names and types use backticks (`` ` ``) for proper
  rendering by JSDoc tooling.
- **`- ` separator:** Always use ` - ` between the parameter name and its description
  (e.g. `@param fn - Does something`).

### Why

Prettier does not enforce a line-length limit inside JSDoc, and its default output
(120+ chars) is unwieldy in terminal windows and side-by-side diffs. The 85-char
hard limit gives a small safety margin above the 80-char soft target so minor
overflow doesn't trigger rewrapping.

### Enforcement

Run `npm run check:jsdoc` (or `npm run lint`, which includes it) to verify
compliance. The script is in `scripts/check-jsdoc-lines.mjs`.
