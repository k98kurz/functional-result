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
  partitionResults,
  validate,
  match,
  fold,
  success,
  failure,
  pipe,
  pipeSync,
  flow,
  flowSync,
} from '../src/functional-result';
import type { Result, ValidationError } from '../src/functional-result';
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

// partitionResults and validate now accept readonly arrays too
const pp = partitionResults(roResults);
const _pp: Expect<
  Equal<typeof pp, { successes: number[]; failures: ParseError[] }>
> = true;
const roValidators: readonly ((s: string) => null)[] = [() => null];
const vl = validate(roValidators)('x');
const _vl: Expect<Equal<typeof vl, Result<string, ValidationError[]>>> = true;

// mixed-error / mixed-type arrays can't be inferred as one Result<T, E>;
// pin the limitation so a future signature change doesn't go unnoticed
const rE1: Result<number, E1> = success(1);
const rE2: Result<number, E2> = success(2);
// @ts-expect-error sequence can't unify Result<number, E1> and Result<number, E2>
sequence([rE1, rE2]);
// @ts-expect-error partitionResults can't unify Result<number, E1> and Result<number, E2>
partitionResults([rE1, rE2]);
// the workaround: pre-annotate the array with the union error type
const annotated: Result<number, E1 | E2>[] = [rE1, rE2];
const sqAnnotated = sequence(annotated);
const _sqAnnotated: Expect<
  Equal<typeof sqAnnotated, Result<number[], E1 | E2>>
> = true;

/* ---------------------------------------------------------------- */
/* match: unchanged behavior still checked                            */
/* ---------------------------------------------------------------- */

const rMatch: Result<number, E1> = success(1);
const mt = match(
  (n: number) => n,
  (e: E1) => -1
)(rMatch);
const _mt: Expect<Equal<typeof mt, number>> = true;

// heterogeneous branch returns infer to a union (fixed by R1 | R2)
const mtHetero = match(
  (n: number) => n,
  (e: E1) => 'bad' as const
)(rMatch);
const _mtHetero: Expect<Equal<typeof mtHetero, number | 'bad'>> = true;

// fold inherits the widened return type
const fdHetero = fold(
  (n: number) => n,
  (e: E1) => 'bad' as const
)(rMatch);
const _fdHetero: Expect<Equal<typeof fdHetero, number | 'bad'>> = true;

// explicit type arguments use the new 4-generic order <T, E, R1, R2>
const mtExplicit = match<number, E1, number, string>(
  (n: number) => n,
  () => 'x'
)(rMatch);
const _mtExplicit: Expect<Equal<typeof mtExplicit, number | string>> = true;

/* ---------------------------------------------------------------- */
/* pipe: 10-op boundary keeps types; 11+ falls back (catch-all)      */
/* ---------------------------------------------------------------- */

const pipeMap = map((n: number) => n);

async function pipeBoundary(): Promise<void> {
  const p10 = await pipe(
    start,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap
  );
  const _p10: Expect<Equal<typeof p10, Result<number, E1>>> = true;

  const p11 = await pipe(
    start,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap
  );
  const _p11: Expect<Equal<typeof p11, Result<any, any>>> = true;
  void _p10;
  void _p11;
}

// The catch-all fallback must NOT swallow type errors in short chains:
// a mismatch in any of the first 10 operations stays a compile error.
const badShort = pipe(
  start,
  // @ts-expect-error map callback is typed for string, but start is Result<number, E1>
  map((s: string) => s.length)
);
void badShort;

// A mismatch at slot 3 of a 13-op chain is also caught (first 10 checked).
const badLong = pipe(
  start,
  pipeMap,
  pipeMap,
  // @ts-expect-error op 3 is typed for string, but prior steps yield Result<number, E1>
  map((s: string) => s.length),
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap
);

/* ---------------------------------------------------------------- */
/* pipe.untyped: dynamic composition without step typing             */
/* ---------------------------------------------------------------- */

// composes a runtime-built op array; result degrades to Result<any, any>
async function pipeUntypedProbe(): Promise<void> {
  const untypedOps = [pipeMap, pipeMap, pipeMap];
  const pu = await pipe.untyped(start, ...untypedOps);
  const _pu: Expect<Equal<typeof pu, Result<any, any>>> = true;
  void _pu;

  // rejects a non-Result initial value
  // @ts-expect-error pipe.untyped requires a Result (or Promise<Result>) initial
  pipe.untyped(42, pipeMap);
}

/* ---------------------------------------------------------------- */
/* pipeSync: sync twin of pipe - no Promise, 10-op boundary          */
/* ---------------------------------------------------------------- */

// zero ops returns the initial Result unchanged (still not a Promise)
const ps0 = pipeSync(start);
const _ps0: Expect<Equal<typeof ps0, Result<number, E1>>> = true;

// basic composition yields Result<number, E1>, NOT Promise<Result<...>>
const ps1 = pipeSync(start, pipeMap);
const _ps1: Expect<Equal<typeof ps1, Result<number, E1>>> = true;

// chain widens errors across steps; map preserves the error channel
const psChain = pipeSync(
  start,
  chain((n: number) => success<string, E2>(String(n)))
);
const _psChain: Expect<Equal<typeof psChain, Result<string, E1 | E2>>> = true;

const psMap = pipeSync(
  start,
  map((n: number) => n * 2)
);
const _psMap: Expect<Equal<typeof psMap, Result<number, E1>>> = true;

// Promise-returning operations are rejected at compile time
// @ts-expect-error pipeSync rejects Promise-returning operations
pipeSync(start, async (r: Result<number, E1>) => r);

// a Promise<Result> initial is rejected (nothing can be awaited)
// @ts-expect-error pipeSync requires a Result initial, not Promise<Result>
pipeSync(Promise.resolve(start), pipeMap);

// the catch-all fallback must NOT swallow type errors in short chains:
// a mismatch among the first 10 operations stays a compile error.
const badSyncShort = pipeSync(
  start,
  // @ts-expect-error map callback is typed for string, but start is Result<number, E1>
  map((s: string) => s.length)
);
void badSyncShort;

// a mismatch at slot 3 of a 13-op chain is also caught (first 10 checked).
const badSyncLong = pipeSync(
  start,
  pipeMap,
  pipeMap,
  // @ts-expect-error op 3 is typed for string, but prior steps yield Result<number, E1>
  map((s: string) => s.length),
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap,
  pipeMap
);

// 10-op boundary keeps types; 11+ falls back to the catch-all
function pipeSyncBoundary(): void {
  const ps10 = pipeSync(
    start,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap
  );
  const _ps10: Expect<Equal<typeof ps10, Result<number, E1>>> = true;

  const ps11 = pipeSync(
    start,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap
  );
  const _ps11: Expect<Equal<typeof ps11, Result<any, any>>> = true;
  void _ps10;
  void _ps11;
}

/* ---------------------------------------------------------------- */
/* pipeSync.untyped: dynamic sync composition without step typing    */
/* ---------------------------------------------------------------- */

// composes a runtime-built op array synchronously; result degrades
const untypedSyncOps = [pipeMap, pipeMap, pipeMap];
const psu = pipeSync.untyped(start, ...untypedSyncOps);
const _psu: Expect<Equal<typeof psu, Result<any, any>>> = true;

// rejects a non-Result initial value
// @ts-expect-error pipeSync.untyped requires a Result initial
pipeSync.untyped(42, pipeMap);

/* ---------------------------------------------------------------- */
/* flow / flowSync: reusable data-last pipelines (deferred E)       */
/* ---------------------------------------------------------------- */

const stepF = (s: string): Result<boolean, E2> => success(s.length > 0);
const flowPipe = flow(
  map((n: number) => String(n)),
  chain(stepF)
);

// the applied function returns a Promise (un-awaited, so the wrapper is pinned)
const p1 = flowPipe(resultE1);
const _p1: Expect<Equal<typeof p1, Promise<Result<boolean, E1 | E2>>>> = true;
const p2 = flowPipe(resultE2);
const _p2: Expect<Equal<typeof p2, Promise<Result<boolean, E2>>>> = true;
void p1;
void p2;
void _p1;
void _p2;

// deferred input E: one flow applied to two different error channels;
// each output keeps its own exact union (guards the silent-unknown collapse)
async function flowDeferred(): Promise<void> {
  const o1 = await flowPipe(resultE1);
  const _o1: Expect<Equal<typeof o1, Result<boolean, E1 | E2>>> = true;
  const o2 = await flowPipe(resultE2);
  const _o2: Expect<Equal<typeof o2, Result<boolean, E2>>> = true;
  void _o1;
  void _o2;
}

// flow accepts Promise-returning ops; the applied result is Promise<Result<...>>
const flowAsyncOp = flow((r: Result<number, unknown>) =>
  Promise.resolve(success<string, ParseError>(String(r.success ? r.data : 0)))
);
async function flowAsyncProbe(): Promise<void> {
  const p = flowAsyncOp(resultE1);
  const _p: Expect<Equal<typeof p, Promise<Result<string, ParseError>>>> = true;
  const o = await flowAsyncOp(resultE1);
  const _o: Expect<Equal<typeof o, Result<string, ParseError>>> = true;
  void p;
  void _p;
  void _o;
}

// flowSync returns the Result directly (not a Promise), E still deferred
const flowSyncPipe = flowSync(
  map((n: number) => String(n)),
  chain(stepF)
);
const fs1 = flowSyncPipe(resultE1);
const _fs1: Expect<Equal<typeof fs1, Result<boolean, E1 | E2>>> = true;
const fs2 = flowSyncPipe(resultE2);
const _fs2: Expect<Equal<typeof fs2, Result<boolean, E2>>> = true;

// flowSync rejects Promise-returning operations
// @ts-expect-error flowSync rejects Promise-returning operations
flowSync((r: Result<number, unknown>) => Promise.resolve(success(1)));

// flowSync's returned function takes a Result, not a Promise<Result>
const fsApply = flowSync(map((n: number) => String(n)));
// @ts-expect-error flowSync's returned function rejects a Promise<Result>
fsApply(Promise.resolve(resultE1));

// adjacent-op channel mismatch: op2 expects number, op1 yields string (both)
// the diagnostic lands on op1, whose return can't satisfy the pinned slot
flow(
  // @ts-expect-error op2 expects Result<number, E>, so op1 must yield number
  map((n: number) => String(n)),
  map((n: number) => n + 1)
);
flowSync(
  // @ts-expect-error op2 expects Result<number, E>, so op1 must yield number
  map((n: number) => String(n)),
  map((n: number) => n + 1)
);

// a narrow-input-E op (mapError pinning E) is rejected; the diagnostic lands
// on the EARLIER op (op1), whose open E can't match the pinned slot
flow(
  // @ts-expect-error narrow mapError fixes E to 'x'; op1's open E can't match
  map((n: number) => String(n)),
  mapError((e: 'x') => e.length)
);
flowSync(
  // @ts-expect-error narrow mapError fixes E to 'x'; op1's open E can't match
  map((n: number) => String(n)),
  mapError((e: 'x') => e.length)
);

// spread arrays are rejected; compose runtime-built arrays via pipe.untyped
const runtimeOps = [map((n: number) => n + 1), map((n: number) => n * 2)];
// @ts-expect-error flow rejects a spread array
flow(...runtimeOps);
// @ts-expect-error flowSync rejects a spread array
flowSync(...runtimeOps);

// partial explicit type args resolve against the 0-arg flow<T, E>() overload
// @ts-expect-error flow<T, E>(...) is unsupported; annotate the first op's callback instead
flow<number, E1>(map((n: number) => n));

// 10-op boundary keeps types; 11+ falls back to the catch-all
async function flowBoundary(): Promise<void> {
  const f10 = flow(
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap
  );
  const f10out = await f10(start);
  const _f10: Expect<Equal<typeof f10out, Result<number, E1>>> = true;

  const f11 = flow(
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap
  );
  const f11out = await f11(start);
  const _f11: Expect<Equal<typeof f11out, Result<any, any>>> = true;
  void _f10;
  void _f11;
}

function flowSyncBoundary(): void {
  const fs10 = flowSync(
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap
  );
  const fs10out = fs10(start);
  const _fs10: Expect<Equal<typeof fs10out, Result<number, E1>>> = true;

  const fs11 = flowSync(
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap,
    pipeMap
  );
  const fs11out = fs11(start);
  const _fs11: Expect<Equal<typeof fs11out, Result<any, any>>> = true;
  void _fs10;
  void _fs11;
}

describe('type-level assertions', () => {
  it('compiles the type assertions (the real checks run under tsc)', () => {
    expect(success(1).success).toBe(true);
    expect(failure('e').success).toBe(false);
  });
});
