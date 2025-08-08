import { Err } from "./result";

/**
 * Represents a successful result.
 * The first element is `null` (indicating no error), and the second is the success value.
 */
export type ResultOk<T> = readonly [null, T];

/**
 * Represents a failed result.
 * The first element is an {@link Err} object, and the second is `null`.
 */
export type ResultErr<E extends string = string, S = unknown> = readonly [
  Err<E, S>,
  null,
];

/**
 * Represents the outcome of an operation that can either succeed or fail.
 * It is a union of {@link ResultOk} and {@link ResultErr}.
 */
export type Result<T, E extends string = string, S = unknown> =
  | ResultOk<T>
  | ResultErr<E, S>;

/**
 * Represents a synchronous function that returns a {@link Result}.
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
 */
export type ResultAsync<T, E extends string = string, S = unknown> = Promise<
  Result<T, E, S>
>;

/**
 * Represents an asynchronous function that returns a {@link ResultAsync}.
 */
export type ResultAsyncFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends unknown[] = any[],
  T = unknown,
  E extends string = string,
  S = unknown,
> = (...args: A) => ResultAsync<T, E, S>;
