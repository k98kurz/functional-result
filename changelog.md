## 0.0.4 (WIP)

- Fixed `tryCatch` type inference: promise-returning thunks now bind `T` to the
  awaited value instead of `Promise<T>` (type-level fix, runtime unchanged)
- Fixed curried generics for `chain`, `map`, and `tap`: the error type is no
  longer frozen at partial application. `chain` widens errors, so
  `chain(fnE1)(resultE2)` now yields `Result<U, E1 | E2>` instead of a type
  error; `map` and `tap` no longer collapse the error channel to `unknown`
- `pipe` overloads now track a per-step error type, so `chain` steps may
  introduce new error types mid-pipeline (type-level fix, runtime unchanged)
- `success` now defaults its error type to `never`; `Result<T, never>` is
  assignable to any `Result<T, E>`, so existing assignments keep compiling

## 0.0.3

- Improved bundled skill file to document an avoidable anti-pattern

## 0.0.2

- Added `tryCatchSync` function for synchronous-only error handling
- Updated documentation with `tryCatchSync` examples and usage guidance

## 0.0.1

- Initial release
- Had to publish as functional-result instead of functionalResult
- Incorporates feedback from prior use copied directly into projects
- Includes an exportable SKILL.md file
