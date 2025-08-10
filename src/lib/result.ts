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

  private static globalObserver?: (err: Err) => void;

  constructor(label: E, source?: S) {
    this.label = label;
    this.source = source ?? (new Error(label) as S);
    if (Err.globalObserver) {
      try {
        Err.globalObserver(this);
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Sets a global observer for all `Err` instances.
   * The observer will be called with the error instance whenever a new `Err` is created.
   * Useful for logging or monitoring errors.
   *
   * @param observer - The observer function to set.
   *
   * @example
   * ```typescript
   * Err.setGlobalObserver((error) => {
   *   console.error(error.source);
   * });
   * ```
   */
  public static setGlobalObserver(observer: (err: Err) => void) {
    Err.globalObserver = observer;
  }

  /** Removes any global observer. */
  public static removeGlobalObserver(): void {
    Err.globalObserver = undefined;
  }

  /**
   * Performs a side effect with the error, then returns the error instance for chaining.
   * @param fn - The function to execute for the side effect.
   * @returns The `Err` instance.
   * @group Core
   *
   * @example
   * ```typescript
   * const [error, value] = new Err("my_error").tap(e => console.error(e.source)).result();
   * ```
   */
  public tap(fn: ((error: this) => void) | undefined): this {
    fn?.(this);
    return this;
  }

  /**
   * Returns a {@link ResultErr} containing this error and `null`.
   *
   * @returns A {@link ResultErr}.
   * @group Core
   *
   * @example
   * ```typescript
   * const [error, value] = new Err("my_error").result();
   * // error is { label: "my_error", source: Error("my_error") }
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
 * Shorthand for `new Err(label, source).result()`.
 *
 * @param label - The error label.
 * @param source - The source of the error. If not provided, a new `Error` with the label as the message will be created.
 * @returns A {@link ResultErr}.
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
  return new Err(label, source).result();
}
