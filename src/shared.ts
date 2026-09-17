import type { NotNullish, ResultErr, ResultOk } from "./types";

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
 * The error cannot be nullish, since `null` in the error slot means "this
 * result is ok". Nullish arguments are rejected at compile time, and replaced
 * with a new Error at runtime as a last resort. See {@link NotNullish}.
 *
 * Any other value is passed through as is, including falsy ones.
 * @group Core
 * @template E The type of the error. Cannot be nullish.
 * @param error The error to wrap in an error result.
 * @returns A ResultErr containing the error.
 * @example
 * ```typescript
 * const [error, value] = err(new Error("Oops")); // [Error: Oops, null]
 * ```
 * @example
 * ```typescript
 * const [error, value] = err("Oops"); // ["Oops", null]
 * ```
 * @example
 * ```typescript
 * const [error, value] = err(null); // Type error: null means "no error"
 * ```
 */
export function err<E extends NotNullish<E>>(error: E): ResultErr<E>;
export function err<E extends NotNullish<E> = Error>(error?: E): ResultErr<E> {
  return [error ?? (new Error() as E), null] as const;
}

export function defaultErrorMapper<E extends NotNullish<E> = Error>(
  error: unknown,
): E {
  return (
    error instanceof Error ? error : new Error(undefined, { cause: error })
  ) as E;
}
