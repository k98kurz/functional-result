# Memory

## Example code is a single source of truth, verified in CI

**Decision (2026-09-03):** Every TypeScript snippet embedded in `readme.md` and
`src/SKILL.md` lives verbatim in `examples/<id>.ts` (the `id` matches a
`<!-- example: <id> -->` sentinel placed immediately above the doc fence).
`scripts/check-examples.mjs` enforces the contract; `npm run check:examples`
runs `tsc -p tsconfig.examples.json` first, then the checker. Both are wired
into `prepublishOnly` and `checklist.sh`. All 41 sentinels are stamped and the
checker verifies snippet sync live (0 errors as of stamping day).

**Example file format:** a `// @docs: <doc>[, <doc>...]` header listing
registered locations, then a snippet region delimited by `// @snippet-start` /
`// @snippet-end`. Scaffold (stub types/helpers the snippet references, plus any
imports the snippet uses but didn't declare) lives OUTSIDE the region so the
doc text stays verbatim. Exactly one region per file (doc snippets each carry
their own imports, which would collide in one file). Imports use the package
name verbatim; `tsconfig.examples.json` maps `@k98kurz/functional-result` to
`./src/functional-result` so examples compile as-is. Base config's
`module: ES2022` permits top-level `await`; `noUnusedLocals` is off.

**Intentionally non-compiling examples** (fragments / deliberate anti-patterns)
go in `examples/illustrative/`, marked `// @no-compile`, and are excluded from
`tsconfig.examples.json`. They are still text-checked.

**Detection on day one:** the checker's first run found 82 missing-sentinel
errors (41 fences unstamped + 41 registered locations absent) and, separately,
8 examples that fail strict compilation due to genuine doc bugs: unannotated
`map`/`tap` callbacks (`map-basic`, `tap-tap-error`, `skill-map`,
`skill-tap-tap-error`), a redeclared `const result` (`skill-creating-results`),
`return pipe(...)` in a `Result`-typed fn (`complex-type-transform`), a
`traverse` result passed to `partitionResults` (`skill-batch-processing`), and
a top-level `return` fragment (`skill-conversion-before`). These are the issues
to fix in the docs (pass 2), NOT scaffold problems. Until they are fixed,
`typecheck:examples` is red, so `npm run check:examples` stops at tsc and the
checker's sentinel report is only visible via `node scripts/check-examples.mjs`.

**Lint covers examples too:** the `lint` script runs eslint over
`examples/**/*.ts` with the base block (recommended + `max-len 85`,
`no-unused-vars` off). `examples/illustrative/` is ignored by eslint (its
`no-redeclare`s are deliberate) just as it is excluded from tsc. Known-red
until pass 2: the 7 region max-len violations (over-length lines copied
verbatim from the docs) + `skill-creating-results` no-redeclare. When fixing
region long lines, wrap them in BOTH the doc fence and the example region so
the checker stays green. Prettier deliberately does NOT cover `examples/`: its
reformatting would desync verbatim regions from the docs and trip the checker.

## Curried functions must not share one error generic across applications

**Gotcha (2026-09-02):** A single `E` on a curried function binds at the first
call: composing distinct error types hard-errors (TS2345), and `map`/`tap` —
whose callbacks never mention `E` — silently collapse the error channel to
`unknown`. `pipe`'s overloads carry one `E` through the whole chain, so the
fix had to keep error-widening steps usable inside `pipe`.

**Solution:** Split generics across applications: `chain` takes `<T, U, F>`
(errors `fn` introduces) on the outer call and `<E>` (input errors) on the
inner one, returning `Result<U, E | F>`; `map`, `tap`, and `getOrElse` take
`E` on the inner function; `success` defaults `E = never` so a bare
`success(x)` doesn't widen the union to `unknown`. Handlers that mention `E`
(`mapError`, `tapError`, `match`, `fold`) need no change — assignability
already accepts narrower input errors. Verify with type-level probes:
Equal/Expect assertions plus `@ts-expect-error` guards for the must-stay-error
cases, run with explicit-file `tsc` flags (no tsconfig covers `temp/`).
Existing probes (`probe-curried-generics*.ts`) are gitignored and may not
survive a clean checkout. For type-only fixes, emitted JS must be identical
after stripping comments.

## Split generics for EVERY channel a curried fn mentions, and check types in CI

**Gotcha (2026-09-03):** The first pass above fixed the *error* channel but
missed the *success* channel. `mapError` (`<T, E, F>` outer) and `tapError`
(`<T, E>` outer) put `T` only on the second (Result) parameter, so at the
curried first call `T` had no inference site and fell back to `unknown`. The
result: applying `mapError(handler)` — a handler `(e: E) => F` — to a
`Result<number, E>` returned `Result<unknown, F>` instead of
`Result<number, F>` — silently, because `Result<number, E>` is assignable to
`Result<unknown, E>`. The claim "handlers that mention `E` need
no change — assignability already accepts narrower input errors" was true for
the error channel only and overlooked `T`. The tapError unannotated-handler case
was worse: `tapError(e => log(e))(r)` collapsed **both** channels to `unknown`.

**Solution:** split generics so that *every* parameter (success and error) is
inferred on the inner application:
- `mapError` → `<E, F>(fn) => <T>(result): Result<T, F>` (T moves inner)
- `tapError` → `<F>(fn) => <T, E extends F>(result): Result<T, E>` (F = errors the
  handler accepts; `E extends F` preserves the actual error type while keeping a
  narrow-handler-on-wider-union a type error)
- `getOrElse` → `<D>(d) => <T, E>(result): T | D` (default need not equal `T`)
- `sequence`/`traverse` → accept `readonly` arrays

**Lesson:** the runtime test suite cannot detect type degradation — a collapsed
`Result<unknown, unknown>` still compiles and runs. Type-level `Equal`/`Expect`
assertions and `@ts-expect-error` safety guards must live in `test/` (covered by
`tsconfig.test.json`, run by `npm run typecheck`), NOT in gitignored `temp/`
probes that CI never executes. Verify emitted JS is unchanged for type-only
fixes. Curried callbacks whose params mention a generic (`traverse`, `match`,
`fold`) can't defer that generic — the callback's parameter must be annotated by
the user (docs now say so); dual-arity overloads were considered and rejected in
favor of documenting the annotation requirement.

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
