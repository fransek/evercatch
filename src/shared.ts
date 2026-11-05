import type { NotNullish, Result, ResultErr, ResultOk } from "./types";

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

/**
 * Checks whether a result is ok, narrowing it to a {@link ResultOk}.
 *
 * Prefer this over `if (!error)` when the error type can be falsy, such as
 * `0`, `""` or `false`: only `null` in the error slot means "this result is
 * ok".
 * @group Core
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The result to check.
 * @returns `true` if the result is ok, `false` if it holds an error.
 * @example
 * ```typescript
 * const result = divide(10, 2);
 *
 * if (isOk(result)) {
 *   console.log(result[1]); // number
 * }
 * ```
 * @example
 * ```typescript
 * const values = results.filter(isOk).map(([, value]) => value);
 * ```
 */
export function isOk<T, E extends NotNullish<E>>(
  result: Result<T, E>,
): result is ResultOk<T> {
  return result[0] === null;
}

/**
 * Checks whether a result holds an error, narrowing it to a {@link ResultErr}.
 *
 * Prefer this over `if (error)` when the error type can be falsy, such as
 * `0`, `""` or `false`: any error that is not `null` counts, falsy or not.
 * @group Core
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The result to check.
 * @returns `true` if the result holds an error, `false` if it is ok.
 * @example
 * ```typescript
 * const result = divide(10, 0);
 *
 * if (isErr(result)) {
 *   console.error(result[0]); // Error
 * }
 * ```
 * @example
 * ```typescript
 * const errors = results.filter(isErr).map(([error]) => error);
 * ```
 */
export function isErr<T, E extends NotNullish<E>>(
  result: Result<T, E>,
): result is ResultErr<E> {
  return result[0] !== null;
}

export function defaultErrorMapper<E extends NotNullish<E> = Error>(
  error: unknown,
): E {
  return (
    error instanceof Error ? error : new Error(undefined, { cause: error })
  ) as E;
}
