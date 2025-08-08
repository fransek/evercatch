import { ResultErr, ResultOk } from "./types";

/**
 * Represents a structured error with a label for identification and a source error.
 *
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 */
export class Err<E extends string = string, S = unknown> {
  /** The label identifying the type of error. */
  readonly label: E;
  /** The source of the error. Can be any value, but typically an `Error` object. */
  readonly source: S;

  constructor(label: E, source?: S) {
    this.label = label;
    this.source = source ?? (new Error(label) as S);
  }

  /**
   * Returns a {@link ResultErr} containing this error and `null`.
   *
   * @returns A {@link ResultErr}.
   * @group Core
   *
   * @example
   * ```typescript
   * const [error, value] = myError.result();
   * // error is myError
   * // value is null
   * ```
   */
  public result(): ResultErr<E, S> {
    return [this, null];
  }
}

/**
 * Creates a {@link ResultOk} with the given value.
 *
 * @param value - The success value to wrap.
 * @returns A {@link ResultOk}.
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
export function ok<T = null>(value: T = null as T): ResultOk<T> {
  return [null, value];
}

/**
 * Creates a {@link ResultErr}.
 * It can be called with a label and source, or with an existing {@link Err} object.
 *
 * @param label - The error label.
 * @param source - The source of the error. If not provided, a new `Error` with the label as the message will be created.
 * @returns A {@link ResultErr}.
 * @template E - A string literal type for the error label.
 * @template S - The type of the source error.
 * @group Core
 *
 * @example
 * ```typescript
 * const [error, value] = err("not_found");
 * // error is { label: "not_found", source: Error("not_found") }
 * // value is null
 * ```
 *
 * @example
 * ```typescript
 * const [error, value] = err("not_found", new Error("Resource not found"));
 * // error is { label: "not_found", source: Error("Resource not found") }
 * // value is null
 * ```
 */
export function err<E extends string = string, S = Error>(
  label: E,
  source?: S,
): ResultErr<E, S> {
  const error = new Err(label, source);
  return [error, null];
}
