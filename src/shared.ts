import type { ResultErr, ResultOk } from "./types";

/**
 * Creates a successful result with the given value.
 * @group Core
 * @template T The type of the value.
 * @param value The value to wrap in a successful result. Defaults to null if not provided.
 * @returns A ResultOk containing the value.
 * @example
 * ```typescript
 * const [error, value] = ok("Success"); // [null, "Success"]
 * ```
 * @example
 * ```typescript
 * const [error, value] = ok(); // [null, null]
 * ```
 */
export function ok<T = null>(value?: T): ResultOk<T> {
  return [null, value ?? (null as T)] as const;
}

/**
 * Creates an error result with the given error.
 * @group Core
 * @template E The type of the error.
 * @param error The error to wrap in an error result. Defaults to a new Error if not provided.
 * @returns A ResultErr containing the error.
 * @example
 * ```typescript
 * const [error, value] = err(new Error("Oops")); // [Error: Oops, null]
 * ```
 * @example
 * ```typescript
 * const [error, value] = err(); // [Error, null]
 * ```
 */
export function err<E = Error>(error?: E): ResultErr<E> {
  return [error ?? (new Error() as E), null] as const;
}

export function defaultErrorMapper<E = Error>(error: unknown): E {
  return (
    error instanceof Error ? error : new Error(undefined, { cause: error })
  ) as E;
}
