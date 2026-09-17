import {
  fromAsyncThrowable,
  fromPromise,
  unwrapAsyncOr,
  unwrapAsyncOrElse,
  unwrapAsyncOrThrow,
} from "./async";
import { err, ok } from "./shared";
import {
  fromThrowable,
  resultFrom,
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

// The namespaces below group the exported functions under the type they work
// with. Each one shares its name with that type, which a value can only do in
// the module where the type is declared, so they live here next to the types.

/**
 * The functions that create and unwrap a {@link Result}, grouped under the
 * type they work with.
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
  /** See {@link resultFrom}. */
  from: resultFrom,
  /** See {@link unwrapOrThrow}. */
  unwrapOrThrow,
  /** See {@link unwrapOr}. */
  unwrapOr,
  /** See {@link unwrapOrElse}. */
  unwrapOrElse,
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
 * The functions that create and unwrap a {@link ResultAsync}, grouped under
 * the type they work with.
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
