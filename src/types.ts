import {
  allAsync,
  andThenAsync,
  collectAsync,
  fromAsyncThrowable,
  fromPromise,
  genAsync,
  mapAsync,
  mapErrAsync,
  matchAsync,
  retry,
  unwrapAsyncOr,
  unwrapAsyncOrElse,
  unwrapAsyncOrThrow,
  withTimeout,
} from "./async";
import { err, isErr, isOk, ok } from "./shared";
import {
  all,
  andThen,
  collect,
  fromNullable,
  fromThrowable,
  gen,
  map,
  mapErr,
  match,
  resultFrom,
  toNullable,
  unwrapOr,
  unwrapOrElse,
  unwrapOrThrow,
} from "./sync";

/**
 * Constraint that rejects error types that could be nullish.
 *
 * `null` in the error slot means "this result is ok, there is no error", so an
 * error can never be `null`. `undefined` is rejected along with it, since it
 * means "no error was passed" everywhere an error is optional.
 *
 * Every error type in this library is constrained with it. Use it when writing
 * your own generic helpers around {@link Result}.
 *
 * `unknown` is allowed, so an error caught in a `catch` block can be passed on
 * as is. `any` is not, since it resolves to a nullish type here; widen it to
 * `unknown` instead.
 * @template E The type of the error.
 * @example
 * ```typescript
 * function logError<E extends NotNullish<E>>(result: Result<unknown, E>) {
 *   const [error] = result;
 *   if (error) {
 *     console.error(error);
 *   }
 * }
 * ```
 */
export type NotNullish<E> = [Extract<E, null | undefined>] extends [never]
  ? unknown
  : never;

/**
 * Represents a successful result containing a value.
 * @template T The type of the value.
 */
export type ResultOk<T> = readonly [null, T];

/**
 * Represents an error result containing an error.
 * @template E The type of the error. Cannot be nullish.
 */
export type ResultErr<E extends NotNullish<E>> = readonly [E, null];

/**
 * Represents a result that can be either successful or an error.
 * @template T The type of the value in case of success.
 * @template E The type of the error in case of failure. Cannot be nullish.
 */
export type Result<T, E extends NotNullish<E>> = ResultOk<T> | ResultErr<E>;

/**
 * A {@link Result} whose error type is computed, such as the union of several
 * error types. The same type, without the {@link NotNullish} check, which
 * TypeScript can't verify for a computed type.
 * @internal
 */
export type UncheckedResult<T, E> = ResultOk<T> | readonly [E, null];

/**
 * Represents an asynchronous result that can be either successful or an error.
 * @template T The type of the value in case of success.
 * @template E The type of the error in case of failure. Cannot be nullish.
 */
export type ResultAsync<T, E extends NotNullish<E>> = Promise<Result<T, E>>;

/**
 * Represents a function that returns a Result.
 * @template F The function type.
 * @template E The type of the error. Cannot be nullish.
 */
export type ResultFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => any,
  E extends NotNullish<E>,
> = (...args: Parameters<F>) => Result<ReturnType<F>, E>;

/**
 * Represents an asynchronous function that returns a ResultAsync.
 * @template F The async function type.
 * @template E The type of the error. Cannot be nullish.
 */
export type ResultAsyncFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => Promise<any>,
  E extends NotNullish<E>,
> = (...args: Parameters<F>) => ResultAsync<Awaited<ReturnType<F>>, E>;

/**
 * Anything the inference types can read a result from: a {@link Result}, a
 * {@link ResultAsync}, or a function returning either, such as a
 * {@link ResultFn} or a {@link ResultAsyncFn}.
 */
export type Inferable =
  | Result<unknown, unknown>
  | ResultAsync<unknown, unknown>
  | ((
      ...args: AnyArgs
    ) => Result<unknown, unknown> | ResultAsync<unknown, unknown>);

// `any[]` rather than `unknown[]`, so functions with typed parameters match.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArgs = any[];

/** Resolves an {@link Inferable} to the result it holds or returns. */
type ResultOf<R extends Inferable> = R extends (...args: AnyArgs) => infer Ret
  ? Awaited<Ret>
  : Awaited<R>;

// Both helpers distribute over the union of result tuples. The ok tuple has
// `null` in the error slot and no error type is nullish, so the two can never
// be mistaken for each other, not even when the value itself is `null`.
/** @internal */
export type OkOf<R> = R extends readonly [null, infer T] ? T : never;
/** @internal */
export type ErrOf<R> = R extends readonly [infer E, unknown]
  ? E extends null
    ? never
    : E
  : never;

/**
 * Infers the value type of a result.
 *
 * Works on a {@link Result}, a {@link ResultAsync}, and on functions returning
 * either, such as a {@link ResultFn} or a {@link ResultAsyncFn}. Promises are
 * unwrapped, so the value type of an async result is the resolved value.
 * @template R The result, async result or result-returning function.
 * @example
 * ```typescript
 * const safeParse = fromThrowable((raw: string): Config => JSON.parse(raw));
 *
 * type Parsed = InferOk<typeof safeParse>; // Config
 * type Fetched = InferOk<ResultAsync<Response, Error>>; // Response
 * ```
 */
export type InferOk<R extends Inferable> = OkOf<ResultOf<R>>;

/**
 * Infers the error type of a result.
 *
 * Works on a {@link Result}, a {@link ResultAsync}, and on functions returning
 * either, such as a {@link ResultFn} or a {@link ResultAsyncFn}. A result that
 * can never fail, such as a {@link ResultOk}, has the error type `never`.
 * @template R The result, async result or result-returning function.
 * @example
 * ```typescript
 * async function fetchUser(id: string): ResultAsync<User, "NOT_FOUND" | "NETWORK"> {
 *   // ...
 * }
 *
 * type FetchUserError = InferErr<typeof fetchUser>; // "NOT_FOUND" | "NETWORK"
 * ```
 */
export type InferErr<R extends Inferable> = ErrOf<ResultOf<R>>;

// The namespaces below group the exported functions under the type they work
// with. Each one shares its name with that type, which a value can only do in
// the module where the type is declared, so they live here next to the types.

/**
 * The functions that create, check, transform, combine and unwrap a
 * {@link Result}, grouped under the type they work with.
 *
 * Every member is also exported on its own, so this is only a matter of
 * preference. The grouped names are shorter, since the type they belong to
 * says what they operate on.
 * @group Namespaces
 * @namespace
 * @example
 * ```typescript
 * import { Result } from "evercatch";
 *
 * const [error, data] = Result.from(() => JSON.parse('{"foo": "bar"}'));
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export const Result = {
  /** See {@link ok}. */
  ok,
  /** See {@link err}. */
  err,
  /** See {@link isOk}. */
  isOk,
  /** See {@link isErr}. */
  isErr,
  /** See {@link resultFrom}. */
  from: resultFrom,
  /** See {@link unwrapOrThrow}. */
  unwrapOrThrow,
  /** See {@link unwrapOr}. */
  unwrapOr,
  /** See {@link unwrapOrElse}. */
  unwrapOrElse,
  /** See {@link map}. */
  map,
  /** See {@link mapErr}. */
  mapErr,
  /** See {@link andThen}. */
  andThen,
  /** See {@link match}. */
  match,
  /** See {@link all}. */
  all,
  /** See {@link collect}. */
  collect,
  /** See {@link gen}. */
  gen,
  /** See {@link fromNullable}. */
  fromNullable,
  /** See {@link toNullable}. */
  toNullable,
} as const;

/**
 * The functions that create a {@link ResultFn}, grouped under the type they
 * return.
 *
 * Every member is also exported on its own, so this is only a matter of
 * preference. The grouped names are shorter, since the type they belong to
 * says what they operate on.
 * @group Namespaces
 * @namespace
 * @example
 * ```typescript
 * import { ResultFn } from "evercatch";
 *
 * const safeParse = ResultFn.from(JSON.parse);
 *
 * const [error, data] = safeParse('{"foo": "bar"}');
 * ```
 */
export const ResultFn = {
  /** See {@link fromThrowable}. */
  from: fromThrowable,
} as const;

/**
 * The functions that create, transform, combine and unwrap a
 * {@link ResultAsync}, grouped under the type they work with.
 *
 * Every member is also exported on its own, so this is only a matter of
 * preference. The grouped names are shorter, since the type they belong to
 * says what they operate on.
 * @group Namespaces
 * @namespace
 * @example
 * ```typescript
 * import { ResultAsync } from "evercatch";
 *
 * const [error, data] = await ResultAsync.from(
 *   fetch("https://api.example.com/data").then((res) => res.json()),
 * );
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export const ResultAsync = {
  /** See {@link fromPromise}. */
  from: fromPromise,
  /** See {@link unwrapAsyncOrThrow}. */
  unwrapOrThrow: unwrapAsyncOrThrow,
  /** See {@link unwrapAsyncOr}. */
  unwrapOr: unwrapAsyncOr,
  /** See {@link unwrapAsyncOrElse}. */
  unwrapOrElse: unwrapAsyncOrElse,
  /** See {@link mapAsync}. */
  map: mapAsync,
  /** See {@link mapErrAsync}. */
  mapErr: mapErrAsync,
  /** See {@link andThenAsync}. */
  andThen: andThenAsync,
  /** See {@link matchAsync}. */
  match: matchAsync,
  /** See {@link allAsync}. */
  all: allAsync,
  /** See {@link collectAsync}. */
  collect: collectAsync,
  /** See {@link genAsync}. */
  gen: genAsync,
  /** See {@link retry}. */
  retry,
  /** See {@link withTimeout}. */
  withTimeout,
} as const;

/**
 * The functions that create a {@link ResultAsyncFn}, grouped under the type
 * they return.
 *
 * Every member is also exported on its own, so this is only a matter of
 * preference. The grouped names are shorter, since the type they belong to
 * says what they operate on.
 * @group Namespaces
 * @namespace
 * @example
 * ```typescript
 * import { ResultAsyncFn } from "evercatch";
 *
 * const safeFetch = ResultAsyncFn.from(fetch);
 *
 * const [error, response] = await safeFetch("https://api.example.com/data");
 * ```
 */
export const ResultAsyncFn = {
  /** See {@link fromAsyncThrowable}. */
  from: fromAsyncThrowable,
} as const;
