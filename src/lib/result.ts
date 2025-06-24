import { ResultErr, ResultOk } from "./types";

/**
 * Extends the built-in `Error` class with a label and an optional source.
 * @template E - The type of the error label, constrained to string
 *
 * @group Core
 */
export class Err<E extends string = string> extends Error {
  /** The label identifying the type of error. */
  label: E;
  /** The source of the error, if applicable. */
  source?: unknown;

  constructor(label: E, message?: string, source?: unknown) {
    super(message);
    this.label = label;
    this.name = "Error";
    this.source = source;
  }

  private static fromError<E extends string = string>(
    error: Error,
    label: E,
  ): Err<E> {
    const err = new Err(label, error.message, error);
    err.cause = error.cause;
    err.name = error.name;
    err.stack = error.stack;
    return err;
  }

  /**
   * Creates an {@link Err} instance from an unknown value.
   *
   * @param source - The error value to convert
   * @param label - The label to identify the error type
   * @returns An {@link Err} instance
   *
   * @example
   * ```typescript
   * const error = new Error("The requested resource was not found");
   * const err = Err.from(error, "NOT_FOUND");
   * ```
   */
  public static from<E extends string = string>(
    source: unknown,
    label: E,
  ): Err<E> {
    if (source instanceof Error) {
      return Err.fromError(source, label);
    }
    if (typeof source === "string") {
      return new Err(label, source, source);
    }
    try {
      return new Err(label, JSON.stringify(source), source);
    } catch {
      return new Err(label, undefined, source);
    }
  }

  /**
   * Creates a {@link ResultErr} from an unknown value.
   *
   * @param source - The error value to convert
   * @param label - The label to identify the error type
   * @returns A {@link ResultErr}
   *
   * @example
   * ```typescript
   * const error = new Error("The requested resource was not found");
   * const result = Err.resultFrom(error, "NOT_FOUND");
   * // result: [Err<"NOT_FOUND">, null]
   * ```
   */
  public static resultFrom<E extends string = string>(
    source: unknown,
    label: E,
  ): ResultErr<E> {
    const e = Err.from(source, label);
    return err(e);
  }
}

/**
 * Creates a new {@link ResultOk}.
 *
 * @param value - The success value (default is null)
 * @returns A {@link ResultOk}
 *
 * @example
 * ```typescript
 * const result = ok("Success");
 * // result: [null, "Success"]
 * ```
 *
 * @group Core
 */
export const ok = <T = null>(value: T = null as T): ResultOk<T> => [
  null,
  value,
];

/**
 * Creates a new {@link ResultErr}.
 *
 * @param label - The error label
 * @param message - Optional error message
 * @returns A {@link ResultErr}
 *
 * @example
 * ```typescript
 * const result = err("NOT_FOUND", "The requested resource was not found");
 * // result: [Err<"NOT_FOUND">, null]
 * ```
 *
 * @group Core
 */
export function err<E extends string = string>(
  label: E,
  message?: string,
): ResultErr<E>;
/**
 * Creates a {@link ResultErr} from an existing {@link Err} instance.
 *
 * @param err - An existing Err instance
 * @returns An error {@link Result}
 *
 * @example
 * ```typescript
 * const error = new Err("NOT_FOUND", "The requested resource was not found");
 * const result = err(error);
 * // result: [Err<"NOT_FOUND">, null]
 * ```
 *
 * @group Core
 */
export function err<E extends string = string>(err: Err<E>): ResultErr<E>;
export function err<E extends string>(
  labelOrErr: E | Err<E>,
  message?: string,
): ResultErr<E> {
  const error =
    labelOrErr instanceof Err ? labelOrErr : new Err(labelOrErr, message);
  return [error, null];
}
