import { describe, expect, it } from "vitest";

import type {
  NotNullish,
  Result,
  ResultAsync,
  ResultAsyncFn,
  ResultErr,
  ResultFn,
  ResultOk,
} from "./types";

/**
 * Type-level assertions: every nullish error type is rejected at compile time.
 * Each `@ts-expect-error` fails the build if the type below it ever compiles.
 */
// @ts-expect-error null means "no error"
export type NullErr = ResultErr<null>;
// @ts-expect-error undefined means "no error"
export type UndefinedErr = ResultErr<undefined>;
// @ts-expect-error a possibly null error is not a valid error type
export type MaybeNullErr = Result<number, Error | null>;
// @ts-expect-error a possibly undefined error is not a valid error type
export type MaybeUndefinedErr = ResultAsync<number, Error | undefined>;
// @ts-expect-error a possibly null error is not a valid error type
export type MaybeNullFn = ResultFn<() => number, string | null>;
// @ts-expect-error a possibly null error is not a valid error type
export type MaybeNullAsyncFn = ResultAsyncFn<() => Promise<number>, 0 | null>;

describe("types", () => {
  it("should model result tuple types", () => {
    const success: ResultOk<number> = [null, 42];
    const failure: ResultErr<Error> = [new Error("test"), null];
    const result: Result<number, Error> = success;

    expect(success).toEqual([null, 42]);
    expect(failure[0]).toBeInstanceOf(Error);
    expect(failure[1]).toBe(null);
    expect(result).toEqual([null, 42]);
  });

  it("should model result function types", async () => {
    const resultFn: ResultFn<(value: number) => string, Error> = (value) => [
      null,
      String(value),
    ];
    const resultAsyncFn: ResultAsyncFn<
      (value: number) => Promise<string>,
      Error
    > = async (value) => [null, String(value)];
    const asyncResult: ResultAsync<string, Error> = Promise.resolve([
      null,
      "hello",
    ] as const);

    expect(resultFn(42)).toEqual([null, "42"]);
    await expect(resultAsyncFn(42)).resolves.toEqual([null, "42"]);
    await expect(asyncResult).resolves.toEqual([null, "hello"]);
  });

  it("should allow error types that are not nullish, including falsy ones", () => {
    type StringErr = Result<number, string>;
    type UnionErr = Result<number, { code: "DB" } | { code: "FILE" }>;
    type UnknownErr = Result<number, unknown>;
    type FalsyErr = Result<number, 0 | "">;

    const stringErr: StringErr = ["boom", null];
    const unionErr: UnionErr = [{ code: "DB" }, null];
    const unknownErr: UnknownErr = [new Error("test"), null];
    const falsyErr: FalsyErr = [0, null];

    expect(stringErr[0]).toBe("boom");
    expect(unionErr[0]).toEqual({ code: "DB" });
    expect(unknownErr[1]).toBe(null);
    expect(falsyErr[0]).toBe(0);
  });

  it("should propagate the constraint to generic helpers", () => {
    const firstError = <T, E extends NotNullish<E>>(
      results: Result<T, E>[],
    ): E | null => {
      for (const [error] of results) {
        if (error) {
          return error;
        }
      }
      return null;
    };

    const error = new Error("test");
    const results: Result<number, Error>[] = [
      [null, 1],
      [error, null],
    ];

    expect(firstError(results)).toBe(error);
    expect(firstError<number, Error>([[null, 1]])).toBe(null);
  });
});
