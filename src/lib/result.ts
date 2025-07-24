import { Err, ResultErr, ResultOk } from "./types";

/**
 * Creates an {@link Err} object.
 *
 * @param label - The label for the error.
 * @param source - The source of the error. If not provided, a new `Error` with the label as the message will be created.
 * @returns An {@link Err} object.
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 * @group Utils
 *
 * @example
 * ```typescript
 * // Create an error with a source error object
 * const cause = new TypeError("Something went wrong");
 * const unexpectedError = createErr("UNEXPECTED_ERROR", cause);
 * // unexpectedError is { label: "UNEXPECTED_ERROR", source: cause }
 *
 * // Create an error without a source
 * const validationError = createErr("VALIDATION_ERROR");
 * // validationError is { label: "VALIDATION_ERROR", source: Error("VALIDATION_ERROR") }
 * ```
 */
export const createErr = <E extends string, S = Error>(
  label: E,
  source?: S,
): Err<E, S> => {
  return {
    label,
    source: source ?? (new Error(label) as S),
  };
};

/**
 * Creates a {@link ResultOk} with the given value.
 *
 * @param value - The success value to wrap.
 * @returns A {@link ResultOk} tuple.
 * @template T - The type of the success value.
 * @group Core
 *
 * @example
 * ```typescript
 * const [error, value] = ok({ id: 1, name: 'John Doe' });
 * // value is { id: 1, name: 'John Doe' }
 * // error is null
 * ```
 *
 * @example
 * ```typescript
 * const [error, value] = ok();
 * // value is null
 * // error is null
 * ```
 */
export const ok = <T = null>(value: T = null as T): ResultOk<T> => [
  null,
  value,
];

/**
 * Creates a {@link ResultErr}.
 * It can be called with a label and source, or with an existing {@link Err} object.
 *
 * @param label - The error label.
 * @param source - The source of the error. If not provided, a new `Error` with the label as the message will be created.
 * @returns A {@link ResultErr} tuple.
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 * @group Core
 *
 * @example
 * ```typescript
 * const [error, value] = err("NOT_FOUND");
 * // error is { label: "NOT_FOUND", source: Error("NOT_FOUND") }
 * // value is null
 * ```
 *
 * @example
 * ```typescript
 * const [error, value] = err("NOT_FOUND", new Error("Resource not found"));
 * // error is { label: "NOT_FOUND", source: Error("Resource not found") }
 * // value is null
 * ```
 */
export function err<E extends string = string, S = Error>(
  label: E,
  source?: S,
): ResultErr<E, S>;
/**
 * Creates a failed {@link ResultErr} from an existing {@link Err} object.
 *
 * @param err - An existing {@link Err} object.
 * @returns A {@link ResultErr} tuple.
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 * @group Core
 *
 * @example
 * ```typescript
 * const existingError = createErr("UNAUTHORIZED");
 * const [error, value] = err(existingError);
 * // error is { label: "UNAUTHORIZED", source: Error("UNAUTHORIZED") }
 * // value is null
 * ```
 */
export function err<E extends string = string, S = unknown>(
  err: Err<E, S>,
): ResultErr<E, S>;
export function err<E extends string = string, S = unknown>(
  labelOrErr: E | Err<E, S>,
  source?: S,
): ResultErr<E, S> {
  const error =
    typeof labelOrErr === "object" ? labelOrErr : createErr(labelOrErr, source);
  return [error, null];
}
