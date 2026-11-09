import type { MaybeAsyncResult, RetryOptions, UnwrapAsync } from "./async";
import {
  allAsync,
  collectAsync,
  fromAsyncThrowable,
  fromPromise,
  genAsync,
  retry,
  unwrapAsyncOr,
  unwrapAsyncOrElse,
  unwrapAsyncOrThrow,
  withTimeout,
} from "./async";
import { ResultAsyncChain, ResultChain } from "./chain";
import type { TimeoutError } from "./errors";
import { err, isErr, isOk, ok } from "./shared";
import type { OkValues } from "./sync";
import {
  all,
  collect,
  fromNullable,
  fromThrowable,
  gen,
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
//
// Result and ResultAsync are also callable, which wraps a result for method
// chaining. They are functions with the namespace members attached, so a
// member can never be named after a property every function already has:
// name, length, call, apply, bind, toString or prototype.

/**
 * Wraps a {@link Result} for method chaining.
 * @param result The result to wrap.
 * @returns A {@link ResultChain}.
 */
function chainResult<T, E extends NotNullish<E>>(
  result: Result<T, E>,
): ResultChain<T, E> {
  return new ResultChain(result);
}

/**
 * Wraps a {@link Result}, or a {@link ResultAsync}, for asynchronous method
 * chaining.
 * @param result The result or async result to wrap.
 * @returns A {@link ResultAsyncChain}, which can be awaited for the tuple.
 */
function chainResultAsync<T, E extends NotNullish<E>>(
  result: Result<T, E> | ResultAsync<T, E>,
): ResultAsyncChain<T, E> {
  return new ResultAsyncChain(result);
}

/**
 * Wraps a result for method chaining, and groups the functions that create,
 * check and combine a {@link Result}.
 *
 * Call it with a result to get a {@link ResultChain}. Its methods transform
 * the result, and `toResult`, `unwrapOr` or `match` end the chain.
 *
 * Every member is also exported on its own, so using the namespace is only a
 * matter of preference. The grouped names are shorter, since the type they
 * belong to says what they operate on.
 * @group Namespaces
 * @namespace
 * @example
 * ```typescript
 * import { Result } from "evercatch";
 *
 * const [error, data] = Result.from(() => JSON.parse('{"foo": "bar"}'));
 *
 * const port = Result(parseNumber(raw)).unwrapOr(3000);
 * ```
 */
export const Result = Object.assign(chainResult, {
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
  /**
   * See {@link unwrapOrThrow}.
   * @deprecated Use `Result(result).unwrapOrThrow()` instead, or the
   * standalone {@link unwrapOrThrow}.
   */
  unwrapOrThrow,
  /**
   * See {@link unwrapOr}.
   * @deprecated Use `Result(result).unwrapOr(fallback)` instead, or the
   * standalone {@link unwrapOr}.
   */
  unwrapOr,
  /**
   * See {@link unwrapOrElse}.
   * @deprecated Use `Result(result).unwrapOrElse(fn)` instead, or the
   * standalone {@link unwrapOrElse}.
   */
  unwrapOrElse,
});

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
 * Wraps an async result for method chaining, and groups the functions that
 * create and combine a {@link ResultAsync}.
 *
 * Call it with a result or an async result to get a
 * {@link ResultAsyncChain}. The chain is a promise of a result, so awaiting it
 * gives back the tuple. The functions in this namespace return chains too,
 * so they can be chained straight away.
 *
 * The standalone versions of these functions return plain promises.
 * @group Namespaces
 * @namespace
 * @example
 * ```typescript
 * import { ResultAsync } from "evercatch";
 *
 * const [error, data] = await ResultAsync.from(fetch(url))
 *   .andThen((response) => ResultAsync.from(response.json()))
 *   .mapErr(() => "NETWORK_ERROR" as const);
 *
 * const [, email] = await ResultAsync(fetchUser(id)).map((user) => user.email);
 * ```
 */
export const ResultAsync = Object.assign(chainResultAsync, {
  /** See {@link fromPromise}. Returns a {@link ResultAsyncChain}. */
  from: <T, E extends NotNullish<E> = Error>(
    promise: Promise<T>,
    mapErr?: (err: unknown) => E,
  ): ResultAsyncChain<T, E> =>
    new ResultAsyncChain(fromPromise(promise, mapErr)),
  /** See {@link allAsync}. Returns a {@link ResultAsyncChain}. */
  all: <const R extends readonly MaybeAsyncResult[]>(
    results: R,
  ): ResultAsyncChain<OkValues<R>, ErrOf<Awaited<R[number]>>> =>
    new ResultAsyncChain(allAsync(results)),
  /** See {@link collectAsync}. Returns a {@link ResultAsyncChain}. */
  collect: <const R extends readonly MaybeAsyncResult[]>(
    results: R,
  ): ResultAsyncChain<OkValues<R>, ErrOf<Awaited<R[number]>>[]> =>
    new ResultAsyncChain(collectAsync(results)),
  /** See {@link genAsync}. Returns a {@link ResultAsyncChain}. */
  gen: <Y extends ResultErr<unknown>, T>(
    fn: ($: UnwrapAsync) => AsyncGenerator<Y, T, unknown>,
  ): ResultAsyncChain<T, ErrOf<Y>> => new ResultAsyncChain(genAsync(fn)),
  /** See {@link retry}. Returns a {@link ResultAsyncChain}. */
  retry: <T, E extends NotNullish<E>>(
    fn: (attempt: number) => Result<T, E> | ResultAsync<T, E>,
    options?: RetryOptions<E>,
  ): ResultAsyncChain<T, E> => new ResultAsyncChain(retry(fn, options)),
  /** See {@link withTimeout}. Returns a {@link ResultAsyncChain}. */
  withTimeout: <T, E extends NotNullish<E> = Error>(
    fn: (signal: AbortSignal) => Promise<T>,
    ms: number,
    mapErr?: (err: unknown) => E,
  ): ResultAsyncChain<T, E | TimeoutError> =>
    new ResultAsyncChain(withTimeout(fn, ms, mapErr)),
  /**
   * See {@link unwrapAsyncOrThrow}.
   * @deprecated Use `ResultAsync(resultAsync).unwrapOrThrow()` instead, or
   * the standalone {@link unwrapAsyncOrThrow}.
   */
  unwrapOrThrow: unwrapAsyncOrThrow,
  /**
   * See {@link unwrapAsyncOr}.
   * @deprecated Use `ResultAsync(resultAsync).unwrapOr(fallback)` instead, or
   * the standalone {@link unwrapAsyncOr}.
   */
  unwrapOr: unwrapAsyncOr,
  /**
   * See {@link unwrapAsyncOrElse}.
   * @deprecated Use `ResultAsync(resultAsync).unwrapOrElse(fn)` instead, or
   * the standalone {@link unwrapAsyncOrElse}.
   */
  unwrapOrElse: unwrapAsyncOrElse,
});

/**
 * The functions that create a {@link ResultAsyncFn}, grouped under the type
 * they return.
 *
 * The wrapped function returns a {@link ResultAsyncChain}, so its result can
 * be chained straight away. The standalone {@link fromAsyncThrowable} returns
 * plain promises.
 * @group Namespaces
 * @namespace
 * @example
 * ```typescript
 * import { ResultAsyncFn } from "evercatch";
 *
 * const safeFetch = ResultAsyncFn.from(fetch);
 *
 * const [error, data] = await safeFetch("https://api.example.com/data").map(
 *   (response) => response.json(),
 * );
 * ```
 */
export const ResultAsyncFn = {
  /** See {@link fromAsyncThrowable}. The wrapped function returns a {@link ResultAsyncChain}. */
  from: <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    F extends (...args: any[]) => Promise<any>,
    E extends NotNullish<E> = Error,
  >(
    fn: F,
    mapErr?: (err: unknown) => E,
  ): ((
    ...args: Parameters<F>
  ) => ResultAsyncChain<Awaited<ReturnType<F>>, E>) => {
    const safeFn = fromAsyncThrowable(fn, mapErr);
    return (...args) => new ResultAsyncChain(safeFn(...args));
  },
} as const;
