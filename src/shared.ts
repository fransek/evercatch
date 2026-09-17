import type { ResultErr, ResultOk, Truthy } from "./types";

/**
 * Creates a successful result with the given value.
 * @group Core
 * @template T The type of the value.
 * @param value The value to wrap in a successful result. Passed through as is.
 * @returns A ResultOk containing the value.
 * @example
 * ```typescript
 * const [error, value] = ok("Success"); // [null, "Success"]
 * ```
 * @example
 * ```typescript
 * const [error, value] = ok(); // [null, undefined]
 * ```
 */
export function ok<T = undefined>(value?: T): ResultOk<T> {
  return [null, value as T] as const;
}

/**
 * Creates an error result with a new Error.
 * @group Core
 * @returns A ResultErr containing a new Error.
 * @example
 * ```typescript
 * const [error, value] = err(); // [Error, null]
 * ```
 */
export function err(): ResultErr<Error>;
/**
 * Creates an error result with the given error.
 *
 * The error has to be truthy, since a falsy error cannot be branched off of.
 * Falsy arguments are rejected at compile time, and replaced with a new Error
 * at runtime as a last resort. See {@link Truthy}.
 * @group Core
 * @template E The type of the error. Has to be truthy.
 * @param error The error to wrap in an error result.
 * @returns A ResultErr containing the error.
 * @example
 * ```typescript
 * const [error, value] = err(new Error("Oops")); // [Error: Oops, null]
 * ```
 * @example
 * ```typescript
 * const [error, value] = err(null); // Type error: null is falsy
 * ```
 */
export function err<const E extends Truthy<E>>(error: E): ResultErr<E>;
export function err<E extends Truthy<E> = Error>(error?: E): ResultErr<E> {
  return [error || (new Error() as E), null] as const;
}

export function defaultErrorMapper<E extends Truthy<E> = Error>(
  error: unknown,
): E {
  return (
    error instanceof Error ? error : new Error(undefined, { cause: error })
  ) as E;
}
