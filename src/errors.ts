/**
 * An Error subclass with a literal `_tag`, created by {@link TaggedError}.
 * @template Tag The tag that identifies the error.
 */
export interface Tagged<Tag extends string> extends Error {
  /** Identifies the error, so a union of errors can be narrowed by tag. */
  readonly _tag: Tag;
}

/**
 * The class returned by {@link TaggedError}.
 * @template Tag The tag that identifies the error.
 */
export interface TaggedErrorConstructor<Tag extends string> {
  new (message?: string, options?: ErrorOptions): Tagged<Tag>;
  readonly prototype: Tagged<Tag>;
}

/**
 * Creates an Error base class with a literal `_tag`. Extend it to give an
 * error type a tag, so a union of errors can be narrowed with a `switch` on
 * `_tag`, and TypeScript can check that every case is handled.
 *
 * The tag is also used as the error's `name`.
 * @group Errors
 * @template Tag The tag that identifies the error.
 * @param tag The tag that identifies the error.
 * @returns A class to extend.
 * @example
 * ```typescript
 * class NotFound extends TaggedError("NotFound") {}
 *
 * class Invalid extends TaggedError("Invalid") {
 *   constructor(readonly field: string) {
 *     super(`${field} is invalid`);
 *   }
 * }
 *
 * function describe(error: NotFound | Invalid) {
 *   switch (error._tag) {
 *     case "NotFound":
 *       return "Not found";
 *     case "Invalid":
 *       return `Check ${error.field}`;
 *   }
 * }
 * ```
 */
export function TaggedError<const Tag extends string>(
  tag: Tag,
): TaggedErrorConstructor<Tag> {
  return class extends Error {
    readonly _tag: Tag = tag;
    override name: string = tag;
  };
}

/**
 * The error returned by {@link withTimeout} when the operation takes too long.
 * @group Errors
 */
export class TimeoutError extends TaggedError("TimeoutError") {
  /**
   * @param ms How long the operation was allowed to take, in milliseconds.
   */
  constructor(readonly ms: number) {
    super(`Timed out after ${ms}ms`);
  }
}
