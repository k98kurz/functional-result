# Memory

## Union-parameter inference in `tryCatch`

**Gotcha (2026-09-02):** `tryCatch`'s original union parameter
`(() => T) | (() => Promise<T>)` bound `T = Promise<X>` for promise-returning
thunks (TypeScript breaks inference ties toward the first union constituent),
typing `.data` as a `Promise` while the runtime correctly awaited to `X`. It
survived unnoticed because tests are excluded from type checking (see
"tsconfig scope and typecheck" above) and Vitest doesn't typecheck.

**Solution:** Ordered overloads with the async signature first — overload
resolution is a documented first-match-wins rule, unlike union inference
tie-breaking. A type-level probe is kept in `temp/probe.ts`; run it with
explicit-file `tsc` flags (`tsconfig.json` only includes `src`) whenever
touching public generics. Consider `Awaited<T>` if a signature ever needs to
normalize promise-or-value returns by construction.

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

**Decision (v0.0.1):** `tsconfig.json` restricts `include` to `["src"]` so
`tsc --noEmit` only checks library code. Test files are excluded from type
checking because they access `.data`/`.error` on `Result` unions without
narrowing (Vitest handles type checking at runtime via the test runner).

**Why not fix test types:**
- Tests work correctly at runtime — the discriminated union properties exist
- Fixing ~55 type errors would require widespread use of `isSuccess`/`isFailure`
  guards or type assertions, making tests harder to read
- Vitest transpiles and runs tests without `tsc`

**Build config** (`tsconfig.core.json`) extends the base and adds explicit
`rootDir: "src"` for correct output structure.

## JSDoc checker Node version compatibility

**Decision (v0.0.1):** `scripts/check-jsdoc-lines.mjs` uses a recursive
directory walk (`readdirSync` + `statSync`) instead of `fs.globSync` to
support the declared `engines >= 18` requirement. `fs.globSync` was added in
Node 22.

## Test tag convention (v0.0.1)

**Decision:** Adopted single-letter test tags to identify which block a test
belongs to.

### Why

Test tags like `[P05]` are the stable anchor for locating tests — they appear in
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

### Criteria

- **Unique:** No collisions between prefixes
- **Stable:** Prefix remains meaningful if a block is renamed later
- **Mnemonic:** Prefix hints at the block content
- **Compact:** Single letter for easy scanning
- **Orderable:** Numerical suffix pinpoints position within a block

### Future

If the library test suite grows sufficiently, two-letter prefixes (e.g., `CT`,
`EH`, `TR`, `CP`, `CL`, `VL`, `AC`, `EC`, `SE`) will scale without ambiguity.

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
