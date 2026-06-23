import { describe, expect, it } from "vitest";

import type {
  Result,
  ResultAsync,
  ResultAsyncFn,
  ResultErr,
  ResultFn,
  ResultOk,
} from "./types";

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
});
