import { defaultErrorMapper, err, ok } from "./shared";
import type { NotNullish, Result, ResultFn } from "./types";

/**
 * Safely executes a function, catching any errors.
 * @group Sync
 * @template T The return type of the function.
 * @template E The type of the error.
 * @param fn The function to execute.
 * @param mapErr A function to map errors to a specific type.
 * @returns A Result containing either the function's return value or the caught error.
 * @example
 * ```typescript
 * const [error, data] = resultFrom(() => JSON.parse('{"foo": "bar"}'));
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export function resultFrom<T, E extends NotNullish<E> = Error>(
  fn: () => T,
  mapErr: (err: unknown) => E = defaultErrorMapper,
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(mapErr(error));
  }
}

/**
 * Wraps a function to return a Result instead of throwing errors.
 * @group Sync
 * @template F The function type.
 * @template E The type of the error.
 * @param fn The function to wrap.
 * @param mapErr A function to map errors to a specific type.
 * @returns A function that returns a Result.
 * @example
 * ```typescript
 * const safeParse = fromThrowable(JSON.parse);
 *
 * const [error, data] = safeParse('{"foo": "bar"}');
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export function fromThrowable<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => any,
  E extends NotNullish<E> = Error,
>(fn: F, mapErr: (err: unknown) => E = defaultErrorMapper): ResultFn<F, E> {
  return (...args) => {
    return resultFrom(() => fn(...args), mapErr);
  };
}

/**
 * Unwraps a Result, throwing the error if it exists.
 * @group Sync
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The Result to unwrap.
 * @returns The unwrapped value.
 * @throws The error if the result contains an error.
 * @example
 * ```typescript
 * const result = someFunctionThatReturnsResult();
 * const value = unwrapOrThrow(result);
 * console.log(value);
 * ```
 */
export function unwrapOrThrow<T, E extends NotNullish<E> = Error>(
  result: Result<T, E>,
): T {
  const [error, value] = result;
  if (error !== null) {
    throw error;
  }
  return value as T;
}

/**
 * Unwraps a Result, returning a fallback value if it contains an error.
 * @group Sync
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The Result to unwrap.
 * @param fallback The value to return when the result contains an error.
 * @returns The unwrapped value or the fallback.
 * @example
 * ```typescript
 * const value = unwrapOr(ok(42), 0);
 * console.log(value); // 42
 * ```
 * @example
 * ```typescript
 * const value = unwrapOr(err(new Error("Oops")), 0);
 * console.log(value); // 0
 * ```
 */
export function unwrapOr<T, E extends NotNullish<E> = Error>(
  result: Result<T, E>,
  fallback: T,
): T {
  const [error, value] = result;
  if (error !== null) {
    return fallback;
  }
  return value as T;
}

/**
 * Unwraps a Result, computing a fallback value from the error when needed.
 * @group Sync
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The Result to unwrap.
 * @param fallbackFn A function that receives the error and returns a fallback value.
 * @returns The unwrapped value or the computed fallback.
 * @example
 * ```typescript
 * const value = unwrapOrElse(ok(42), () => 0);
 * console.log(value); // 42
 * ```
 * @example
 * ```typescript
 * const value = unwrapOrElse(
 *   err(new Error("Oops")),
 *   (error) => error.message.length,
 * );
 * console.log(value); // 4
 * ```
 */
export function unwrapOrElse<T, E extends NotNullish<E> = Error>(
  result: Result<T, E>,
  fallbackFn: (err: E) => T,
): T {
  const [error, value] = result;
  if (error !== null) {
    return fallbackFn(error);
  }
  return value as T;
}

/**
 * Executes a function, returning a fallback value if it throws.
 *
 * Shorthand for `unwrapOr(resultFrom(fn), fallback)`, with an optional hook to
 * observe the error, for logging or reporting, before it is discarded.
 *
 * Anything thrown that isn't an `Error` is wrapped in one, with the original
 * value kept as `cause`, just as {@link resultFrom} does.
 * @group Sync
 * @template T The return type of the function.
 * @param fn The function to execute.
 * @param fallback The value to return when the function throws.
 * @param tapErr A function called with the error when the function throws.
 * @returns The function's return value or the fallback.
 * @example
 * ```typescript
 * const config = unwrapFromOr(() => JSON.parse(raw), {});
 * ```
 * @example
 * ```typescript
 * const config = unwrapFromOr(() => JSON.parse(raw), {}, (error) =>
 *   console.warn("Invalid config, using defaults", error),
 * );
 * ```
 */
export function unwrapFromOr<T>(
  fn: () => T,
  fallback: T,
  tapErr?: (err: Error) => void,
): T {
  return unwrapOrElse(resultFrom(fn), (error) => {
    tapErr?.(error);
    return fallback;
  });
}

/**
 * Executes a function, computing a fallback value from the error if it throws.
 *
 * Shorthand for `unwrapOrElse(resultFrom(fn), fallbackFn)`.
 *
 * Anything thrown that isn't an `Error` is wrapped in one, with the original
 * value kept as `cause`, just as {@link resultFrom} does.
 * @group Sync
 * @template T The return type of the function.
 * @param fn The function to execute.
 * @param fallbackFn A function that receives the error and returns a fallback value.
 * @returns The function's return value or the computed fallback.
 * @example
 * ```typescript
 * const config = unwrapFromOrElse(
 *   () => JSON.parse(raw),
 *   (error) => ({ error: error.message }),
 * );
 * ```
 */
export function unwrapFromOrElse<T>(
  fn: () => T,
  fallbackFn: (err: Error) => T,
): T {
  return unwrapOrElse(resultFrom(fn), fallbackFn);
}
