// @docs: src/SKILL.md
import { success } from '@k98kurz/functional-result';
import type { Result } from '@k98kurz/functional-result';
const validateUser = (input: unknown): Result<unknown, unknown> => success(input);
const addDefaults = <T>(value: T): T => value;
const saveToDb = (input: unknown): Result<unknown, unknown> => success(input);
// @snippet-start
import { pipe, validate, map, chain } from '@k98kurz/functional-result';

const validateAndProcessUser = (input: unknown) => {
  return pipe(
    success(input),
    chain(validateUser), // Returns Result<ValidatedUser, ValidationError[]>
    map(addDefaults),    // Cannot fail, so use map
    chain(saveToDb)      // May fail, so use chain
  );
};
// @snippet-end