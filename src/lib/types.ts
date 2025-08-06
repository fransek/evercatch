import { Err } from "./result";

/**
 * Represents a successful result tuple.
 * The first element is `null` (indicating no error), and the second is the success value.
 *
 * @template T - The type of the success value.
 */
export type ResultOk<T> = readonly [null, T];

/**
 * Represents a failed result tuple.
 * The first element is an {@link Err} object, and the second is `null`.
 *
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 */
export type ResultErr<E extends string = string, S = unknown> = readonly [
  Err<E, S>,
  null,
];

/**
 * Represents the outcome of an operation that can either succeed or fail.
 * It is a union of {@link ResultOk} and {@link ResultErr}.
 *
 * @template T - The type of the success value.
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 */
export type Result<T, E extends string = string, S = unknown> =
  | ResultOk<T>
  | ResultErr<E, S>;

/**
 * Represents a synchronous function that returns a {@link Result}.
 *
 * @template A - The arguments of the function.
 * @template T - The type of the success value.
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 */
export type ResultFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends unknown[] = any[],
  T = unknown,
  E extends string = string,
  S = unknown,
> = (...args: A) => Result<T, E, S>;

/**
 * Represents an asynchronous operation that returns a {@link Result}.
 * It is a `Promise` that resolves to a {@link Result}.
 *
 * @template T - The type of the success value.
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 */
export type ResultAsync<T, E extends string = string, S = unknown> = Promise<
  Result<T, E, S>
>;

/**
 * Represents an asynchronous function that returns a {@link ResultAsync}.
 *
 * @template A - The arguments of the function.
 * @template T - The type of the success value.
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 */
export type ResultAsyncFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends unknown[] = any[],
  T = unknown,
  E extends string = string,
  S = unknown,
> = (...args: A) => ResultAsync<T, E, S>;
