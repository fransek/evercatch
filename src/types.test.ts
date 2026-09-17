import { describe, expect, it } from "vitest";

import type {
  Result,
  ResultAsync,
  ResultAsyncFn,
  ResultErr,
  ResultFn,
  ResultOk,
  Truthy,
} from "./types";

/**
 * Type-level assertions: every falsy error type is rejected at compile time.
 * Each `@ts-expect-error` fails the build if the type below it ever compiles.
 */
// @ts-expect-error null is not a valid error type
export type NullErr = ResultErr<null>;
// @ts-expect-error undefined is not a valid error type
export type UndefinedErr = ResultErr<undefined>;
// @ts-expect-error a possibly null error is not a valid error type
export type MaybeErr = Result<number, Error | null>;
// @ts-expect-error "" is not a valid error type
export type EmptyStringErr = ResultAsync<number, "">;
// @ts-expect-error 0 is not a valid error type
export type ZeroErr = ResultFn<() => number, 0>;
// @ts-expect-error false is not a valid error type
export type FalseErr = ResultAsyncFn<() => Promise<number>, false>;

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

  it("should allow truthy error types", () => {
    type StringErr = Result<number, string>;
    type UnionErr = Result<number, { code: "DB" } | { code: "FILE" }>;
    type UnknownErr = Result<number, unknown>;

    const stringErr: StringErr = ["boom", null];
    const unionErr: UnionErr = [{ code: "DB" }, null];
    const unknownErr: UnknownErr = [new Error("test"), null];

    expect(stringErr[0]).toBe("boom");
    expect(unionErr[0]).toEqual({ code: "DB" });
    expect(unknownErr[1]).toBe(null);
  });

  it("should propagate the constraint to generic helpers", () => {
    const firstError = <T, E extends Truthy<E>>(
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
