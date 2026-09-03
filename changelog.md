## 0.0.4 (WIP)

- Fixed `tryCatch` type inference: promise-returning thunks now bind `T` to the
  awaited value instead of `Promise<T>` (type-level fix, runtime unchanged)

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
