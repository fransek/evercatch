import { handleError } from "./shared";
import type { Options, Result, ResultFn } from "./types";

/**
 * Safely executes a function, catching any errors.
 * @group Sync
 * @template T The return type of the function.
 * @template E The type of the error.
 * @param fn The function to execute.
 * @param options Options for error handling.
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
export function resultFrom<T, E = Error>(
  fn: () => T,
  options?: Options<E>,
): Result<T, E> {
  try {
    return [null, fn()] as const;
  } catch (error) {
    return handleError(error, options);
  }
}

/**
 * Wraps a function to return a Result instead of throwing errors.
 * @group Sync
 * @template F The function type.
 * @template E The type of the error.
 * @param fn The function to wrap.
 * @param options Options for error handling.
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromThrowable<F extends (...args: any[]) => any, E = Error>(
  fn: F,
  options?: Options<E>,
): ResultFn<F, E> {
  return (...args) => {
    return resultFrom(() => fn(...args), options);
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
export function unwrapOrThrow<T, E = Error>(result: Result<T, E>): T {
  const [error, value] = result;
  if (error) {
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
export function unwrapOr<T, E = Error>(result: Result<T, E>, fallback: T): T {
  const [error, value] = result;
  if (error) {
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
export function unwrapOrElse<T, E = Error>(
  result: Result<T, E>,
  fallbackFn: (err: E) => T,
): T {
  const [error, value] = result;
  if (error) {
    return fallbackFn(error);
  }
  return value as T;
}
