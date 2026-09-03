/**
 * Type-level assertions for the functional-result combinators.
 *
 * Runtime tests (functional-result.test.ts) cannot detect type degradation —
 * a collapsed `Result<unknown, unknown>` is silently assignable to almost
 * anything — so this file locks the inferred types with `Equal`/`Expect`
 * assertions (compile-time, via `npm run typecheck`) and `@ts-expect-error`
 * guards for cases that MUST remain type errors. It doubles as a trivial
 * vitest case so the file is exercised by both checkers.
 *
 * These assertions were previously scattered in gitignored `temp/` probes
 * where CI never ran them; keeping them here makes the type-level contract
 * part of the checked-in test suite.
 */
import {
  chain,
  map,
  tap,
  mapError,
  tapError,
  getOrElse,
  sequence,
  traverse,
  match,
  success,
  failure,
  pipe,
} from '../src/functional-result';
import type { Result } from '../src/functional-result';
import { describe, expect, it } from 'vitest';

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

type E1 = { readonly tag: 'e1' };
type E2 = { readonly tag: 'e2' };
type ParseError = { readonly kind: 'parse' };

const resultE1: Result<number, E1> = success(1);
const resultE2: Result<number, E2> = success(2);
const step1 = (n: number): Result<string, E1> => success(String(n));
const step2 = (s: string): Result<boolean, E2> => success(s.length > 0);
const start: Result<number, E1> = success(1);

/* ---------------------------------------------------------------- */
/* chain / map / tap: regression guards (fixed in 0a7d347)           */
/* ---------------------------------------------------------------- */

// chain widens errors across applications
const c1 = chain(step1)(resultE2);
const _c1: Expect<Equal<typeof c1, Result<string, E1 | E2>>> = true;

// stored partial application defers E (apply it, then assert)
const f = chain(step1);
const f1 = f(resultE1);
const f2 = f(resultE2);
const _f1: Expect<Equal<typeof f1, Result<string, E1>>> = true;
const _f2: Expect<Equal<typeof f2, Result<string, E1 | E2>>> = true;

// nested composition across distinct Es
const nested = chain(step2)(chain(step1)(start));
const _nested: Expect<Equal<typeof nested, Result<boolean, E1 | E2>>> = true;

// map/tap preserve the specific error channel (no silent unknown)
const m = map((n: number) => String(n))(resultE2);
const _m: Expect<Equal<typeof m, Result<string, E2>>> = true;
const tp = tap((n: number) => void n)(resultE2);
const _tp: Expect<Equal<typeof tp, Result<number, E2>>> = true;

// pipe tracks per-step error widening
async function pipeProbe(): Promise<void> {
  const p = await pipe(start, chain(step1), chain(step2));
  const _p: Expect<Equal<typeof p, Result<boolean, E1 | E2>>> = true;
  void _p;
}

/* ---------------------------------------------------------------- */
/* mapError: success channel must survive (was Result<unknown, F>)   */
/* ---------------------------------------------------------------- */

const rUnion: Result<number, E1 | ParseError> = success(1);
const normalizeError = (e: E1): E2 => ({ tag: 'e2' });
const normalizeUnknown = (e: unknown): E2 => ({ tag: 'e2' });

// annotated handler preserves the data type
const me1 = mapError(normalizeError)(resultE1);
const _me1: Expect<Equal<typeof me1, Result<number, E2>>> = true;

// unknown-accepting handler on a union-error result
const me2 = mapError(normalizeUnknown)(rUnion);
const _me2: Expect<Equal<typeof me2, Result<number, E2>>> = true;

// unannotated handler preserves the data type
const me3 = mapError(e => `err: ${String(e)}`)(resultE1);
const _me3: Expect<Equal<typeof me3, Result<number, string>>> = true;

// stored partial reusable across data types (apply it, then assert)
const storedMe = mapError(normalizeError);
const storedMeOut = storedMe(resultE1);
const _storedMe: Expect<Equal<typeof storedMeOut, Result<number, E2>>> = true;

// safety: narrow handler on union-error result must stay a type error
// @ts-expect-error normalizeError cannot handle ParseError
mapError(normalizeError)(rUnion);

/* ---------------------------------------------------------------- */
/* tapError: both channels preserved (was Result<unknown, unknown>)  */
/* ---------------------------------------------------------------- */

// annotated handler
const te1 = tapError((e: E1) => void e)(resultE1);
const _te1: Expect<Equal<typeof te1, Result<number, E1>>> = true;

// UNannotated handler: E preserved, no collapse to unknown
const te2 = tapError(e => void e)(resultE2);
const _te2: Expect<Equal<typeof te2, Result<number, E2>>> = true;

// stored partial reusable across error types (apply it, then assert)
const storedTe = tapError(e => void e);
const storedTeOut = storedTe(resultE2);
const _te3: Expect<Equal<typeof storedTeOut, Result<number, E2>>> = true;

// safety: narrow handler on union-error result must stay a type error
// @ts-expect-error handler accepts only E1, result has E1 | E2
tapError((e: E1) => void e)({ success: true, data: 1 } as Result<
  number,
  E1 | E2
>);

/* ---------------------------------------------------------------- */
/* getOrElse: supertype/unrelated defaults (T | D)                   */
/* ---------------------------------------------------------------- */

// nullable default on a nullable-T result (previously TS2345)
const rNull: Result<string | null, E1> = success('x');
const go1 = getOrElse(null)(rNull);
const _go1: Expect<Equal<typeof go1, string | null>> = true;

// exact-typed default collapses the union back to T
const go2 = getOrElse(0)(resultE1);
const _go2: Expect<Equal<typeof go2, number>> = true;

/* ---------------------------------------------------------------- */
/* sequence / traverse: readonly arrays accepted                     */
/* ---------------------------------------------------------------- */

const roResults: readonly Result<number, ParseError>[] = [success(1)];
const roItems: readonly string[] = ['1'];
const sq = sequence(roResults);
const _sq: Expect<Equal<typeof sq, Result<number[], ParseError>>> = true;
const tr = traverse((s: string) => success(Number(s)))(roItems);
const _tr: Expect<Equal<typeof tr, Result<number[], never>>> = true;

/* ---------------------------------------------------------------- */
/* match: unchanged behavior still checked                            */
/* ---------------------------------------------------------------- */

const rMatch: Result<number, E1> = success(1);
const mt = match(
  (n: number) => n,
  (e: E1) => -1
)(rMatch);
const _mt: Expect<Equal<typeof mt, number>> = true;

describe('type-level assertions', () => {
  it('compiles the type assertions (the real checks run under tsc)', () => {
    expect(success(1).success).toBe(true);
    expect(failure('e').success).toBe(false);
  });
});
