import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  allAsync,
  andThenAsync,
  collectAsync,
  fromAsyncThrowable,
  fromPromise,
  genAsync,
  mapAsync,
  mapErrAsync,
  matchAsync,
  orElseAsync,
  retry,
  tapAsync,
  tapErrAsync,
  unwrapAsyncOr,
  unwrapAsyncOrElse,
  unwrapAsyncOrThrow,
  withTimeout,
} from "./async";
import { TimeoutError } from "./errors";
import { err, ok } from "./shared";
import type { Result, ResultAsync, ResultOk } from "./types";

describe("async", () => {
  describe("resultFromPromise", () => {
    it("should return ok result when promise resolves", async () => {
      await expect(fromPromise(Promise.resolve(42))).resolves.toEqual([
        null,
        42,
      ]);
    });

    it("should return err result when promise rejects", async () => {
      await expect(
        fromPromise(Promise.reject(new Error("test error"))),
      ).resolves.toEqual([expect.any(Error), null]);
    });

    it("should use mapErr", async () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));

      const result = await fromPromise(Promise.reject("original"), mapErr);

      expect(result).toEqual([expect.any(Error), null]);
      expect(mapErr).toHaveBeenCalledWith("original");
    });
  });

  describe("fromAsyncThrowable", () => {
    it("should wrap an async function to return ResultAsync", async () => {
      const wrapped = fromAsyncThrowable(async (value: number) => value * 2);
      await expect(wrapped(5)).resolves.toEqual([null, 10]);
    });

    it("should catch errors in wrapped async function", async () => {
      const wrapped = fromAsyncThrowable(async () => {
        throw new Error("test");
      });

      await expect(wrapped()).resolves.toEqual([expect.any(Error), null]);
    });

    it("should pass mapErr to fromPromise", async () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));
      const wrapped = fromAsyncThrowable(async () => {
        throw "test";
      }, mapErr);

      await expect(wrapped()).resolves.toEqual([expect.any(Error), null]);
      expect(mapErr).toHaveBeenCalledWith("test");
    });
  });

  describe("unwrapAsyncOrThrow", () => {
    it("should return the value when result is ok", async () => {
      await expect(unwrapAsyncOrThrow(Promise.resolve(ok(42)))).resolves.toBe(
        42,
      );
    });

    it("should throw the error when result is err", async () => {
      const error = new Error("test error");
      await expect(
        unwrapAsyncOrThrow(Promise.resolve(err(error))),
      ).rejects.toThrow(error);
    });

    it("should reject with falsy errors that are not nullish", async () => {
      for (const error of [0, "", false, 0n]) {
        await expect(
          unwrapAsyncOrThrow(Promise.resolve(err(error))),
        ).rejects.toBe(error);
      }
    });
  });

  describe("unwrapAsyncOr", () => {
    it("should return the value when result is ok", async () => {
      await expect(unwrapAsyncOr(Promise.resolve(ok(42)), 0)).resolves.toBe(42);
    });

    it("should return the fallback when result is err", async () => {
      await expect(
        unwrapAsyncOr(Promise.resolve(err(new Error("test error"))), 0),
      ).resolves.toBe(0);
    });

    it("should return the fallback when the error is falsy", async () => {
      for (const error of [0, "", false, 0n]) {
        await expect(
          unwrapAsyncOr(Promise.resolve(err(error)), 1),
        ).resolves.toBe(1);
      }
    });
  });

  describe("unwrapAsyncOrElse", () => {
    it("should return the value when result is ok without calling fallback", async () => {
      const fallbackFn = vi.fn(() => 0);

      await expect(
        unwrapAsyncOrElse(Promise.resolve(ok(42)), fallbackFn),
      ).resolves.toBe(42);
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it("should return the computed fallback when result is err", async () => {
      const error = new Error("test error");
      const fallbackFn = vi.fn(
        (receivedError: Error) => receivedError.message.length,
      );

      await expect(
        unwrapAsyncOrElse(Promise.resolve(err(error)), fallbackFn),
      ).resolves.toBe("test error".length);
      expect(fallbackFn).toHaveBeenCalledWith(error);
    });

    it("should call the fallback with a falsy error", async () => {
      for (const error of [0, "", false, 0n]) {
        const fallbackFn = vi.fn(() => 1);

        await expect(
          unwrapAsyncOrElse(Promise.resolve(err(error)), fallbackFn),
        ).resolves.toBe(1);
        expect(fallbackFn).toHaveBeenCalledWith(error);
      }
    });
  });
});

async function fetchNumber(raw: string): ResultAsync<number, "NAN"> {
  const value = Number(raw);
  return Number.isNaN(value) ? err("NAN" as const) : ok(value);
}

function positive(value: number): Result<number, "NEGATIVE"> {
  return value < 0 ? err("NEGATIVE" as const) : ok(value);
}

describe("async combinators", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("mapAsync", () => {
    it("should transform the value with a sync or async function", async () => {
      await expect(mapAsync(fetchNumber("4"), (v) => v * 2)).resolves.toEqual([
        null,
        8,
      ]);

      const result = await mapAsync(fetchNumber("4"), async (v) => String(v));
      expect(result).toEqual([null, "4"]);
      expectTypeOf(result).toEqualTypeOf<Result<string, "NAN">>();
    });

    it("should pass errors through without calling fn", async () => {
      const fn = vi.fn();

      await expect(mapAsync(fetchNumber("x"), fn)).resolves.toEqual([
        "NAN",
        null,
      ]);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("mapErrAsync", () => {
    it("should transform the error with a sync or async function", async () => {
      const result = await mapErrAsync(fetchNumber("x"), async (e) => ({
        code: e,
      }));

      expect(result).toEqual([{ code: "NAN" }, null]);
      expectTypeOf(result).toEqualTypeOf<Result<number, { code: "NAN" }>>();
    });

    it("should pass ok results through without calling fn", async () => {
      const fn = vi.fn(() => "mapped");

      await expect(mapErrAsync(fetchNumber("4"), fn)).resolves.toEqual([
        null,
        4,
      ]);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("andThenAsync", () => {
    it("should chain sync and async result-returning functions", async () => {
      const result = await andThenAsync(fetchNumber("4"), positive);

      expect(result).toEqual([null, 4]);
      expectTypeOf(result).toEqualTypeOf<Result<number, "NAN" | "NEGATIVE">>();
      await expect(
        andThenAsync(fetchNumber("4"), (v) => fetchNumber(String(v + 1))),
      ).resolves.toEqual([null, 5]);
    });

    it("should short circuit on the first error", async () => {
      const fn = vi.fn(positive);

      await expect(andThenAsync(fetchNumber("x"), fn)).resolves.toEqual([
        "NAN",
        null,
      ]);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("orElseAsync", () => {
    it("should recover with a sync or async result", async () => {
      await expect(
        orElseAsync(fetchNumber("x"), () => fetchNumber("1")),
      ).resolves.toEqual([null, 1]);
      await expect(
        orElseAsync(fetchNumber("x"), () => positive(-1)),
      ).resolves.toEqual(["NEGATIVE", null]);
    });

    it("should pass ok results through without calling fn", async () => {
      const fn = vi.fn();

      await expect(orElseAsync(fetchNumber("4"), fn)).resolves.toEqual([
        null,
        4,
      ]);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("tapAsync and tapErrAsync", () => {
    it("should await the callback and return the same result", async () => {
      const order: string[] = [];
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push("tap");
      };

      const result = await tapAsync(fetchNumber("4"), fn);
      order.push("after");

      expect(result).toEqual([null, 4]);
      expect(order).toEqual(["tap", "after"]);
    });

    it("should only call each callback on its own outcome", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      await tapAsync(fetchNumber("x"), onOk);
      await tapErrAsync(fetchNumber("4"), onErr);
      await tapErrAsync(fetchNumber("x"), onErr);

      expect(onOk).not.toHaveBeenCalled();
      expect(onErr).toHaveBeenCalledOnce();
      expect(onErr).toHaveBeenCalledWith("NAN");
    });
  });

  describe("matchAsync", () => {
    it("should call the matching handler and await it", async () => {
      const handlers = {
        ok: async (v: number) => `ok: ${v}`,
        err: (e: "NAN") => `err: ${e}`,
      };

      await expect(matchAsync(fetchNumber("4"), handlers)).resolves.toBe(
        "ok: 4",
      );
      await expect(matchAsync(fetchNumber("x"), handlers)).resolves.toBe(
        "err: NAN",
      );
    });
  });

  describe("allAsync", () => {
    it("should combine async and sync results into a tuple", async () => {
      const result = await allAsync([fetchNumber("1"), ok("two")]);

      expect(result).toEqual([null, [1, "two"]]);
      expectTypeOf(result[1]).toEqualTypeOf<[number, string] | null>();
    });

    it("should return the first error in input order", async () => {
      const slow = new Promise<Result<number, "SLOW">>((resolve) =>
        setTimeout(() => resolve(err("SLOW" as const)), 10),
      );

      const result = await allAsync([slow, fetchNumber("x")]);

      expect(result).toEqual(["SLOW", null]);
      expectTypeOf(result[0]).toEqualTypeOf<"SLOW" | "NAN" | null>();
    });

    it("should run the results concurrently", async () => {
      vi.useFakeTimers();
      const delayed = (value: number) =>
        new Promise<Result<number, never>>((resolve) =>
          setTimeout(() => resolve(ok(value)), 100),
        );

      const promise = allAsync([delayed(1), delayed(2)]);
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).resolves.toEqual([null, [1, 2]]);
    });
  });

  describe("collectAsync", () => {
    it("should collect every error in input order", async () => {
      const result = await collectAsync([
        fetchNumber("x"),
        positive(-1),
        fetchNumber("1"),
      ]);

      expect(result).toEqual([["NAN", "NEGATIVE"], null]);
      expectTypeOf(result[0]).toEqualTypeOf<("NAN" | "NEGATIVE")[] | null>();
    });

    it("should return the values when every result is ok", async () => {
      await expect(
        collectAsync([fetchNumber("1"), fetchNumber("2")]),
      ).resolves.toEqual([null, [1, 2]]);
    });
  });

  describe("genAsync", () => {
    it("should unwrap both results and async results", async () => {
      const result = await genAsync(async function* ($) {
        const a = yield* $(fetchNumber("4"));
        const b = yield* $(positive(a - 2));
        return a + b;
      });

      expect(result).toEqual([null, 6]);
      expectTypeOf(result).toEqualTypeOf<
        ResultOk<number> | readonly ["NAN" | "NEGATIVE", null]
      >();
    });

    it("should stop at the first error and run finally blocks", async () => {
      const after = vi.fn();
      const cleanup = vi.fn();

      const result = await genAsync(async function* ($) {
        try {
          const a = yield* $(fetchNumber("x"));
          after();
          return a;
        } finally {
          cleanup();
        }
      });

      expect(result).toEqual(["NAN", null]);
      expect(after).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledOnce();
    });
  });

  describe("retry", () => {
    it("should return the first ok result", async () => {
      const fn = vi
        .fn<(attempt: number) => ResultAsync<number, "FAIL">>()
        .mockResolvedValueOnce(err("FAIL" as const))
        .mockResolvedValueOnce(ok(42));

      await expect(retry(fn)).resolves.toEqual([null, 42]);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, 1);
      expect(fn).toHaveBeenNthCalledWith(2, 2);
    });

    it("should return the last error after running out of attempts", async () => {
      let calls = 0;
      const fn = () => err(`fail ${++calls}`);

      await expect(retry(fn, { attempts: 4 })).resolves.toEqual([
        "fail 4",
        null,
      ]);
      expect(calls).toBe(4);
    });

    it("should default to 3 attempts", async () => {
      const fn = vi.fn(() => err("FAIL"));

      await retry(fn);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should stop when shouldRetry returns false", async () => {
      const fn = vi.fn(() => err("FATAL"));
      const shouldRetry = vi.fn(() => false);

      await expect(retry(fn, { shouldRetry })).resolves.toEqual([
        "FATAL",
        null,
      ]);
      expect(fn).toHaveBeenCalledOnce();
      expect(shouldRetry).toHaveBeenCalledWith("FATAL", 1);
    });

    it("should wait between attempts", async () => {
      vi.useFakeTimers();
      const fn = vi.fn(() => err("FAIL"));
      const delay = vi.fn((attempt: number) => attempt * 100);

      const promise = retry(fn, { attempts: 3, delay });
      await vi.advanceTimersByTimeAsync(0);
      expect(fn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(100);
      expect(fn).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(199);
      expect(fn).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(fn).toHaveBeenCalledTimes(3);

      await promise;
      expect(delay).toHaveBeenCalledWith(1, "FAIL");
      expect(delay).toHaveBeenCalledTimes(2);
    });
  });

  describe("withTimeout", () => {
    it("should return the value when the function finishes in time", async () => {
      const result = await withTimeout(async () => 42, 100);

      expect(result).toEqual([null, 42]);
      expectTypeOf(result[0]).toEqualTypeOf<Error | TimeoutError | null>();
    });

    it("should return a TimeoutError and abort the signal when too slow", async () => {
      vi.useFakeTimers();
      let signal: AbortSignal | undefined;

      const promise = withTimeout(
        (s) =>
          new Promise((resolve) => {
            signal = s;
            setTimeout(resolve, 1000);
          }),
        100,
      );
      await vi.advanceTimersByTimeAsync(100);
      const [error] = await promise;

      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).ms).toBe(100);
      expect(signal?.aborted).toBe(true);
      expect(signal?.reason).toBe(error);
    });

    it("should catch errors thrown by the function, sync or async", async () => {
      const [asyncError] = await withTimeout(async () => {
        throw new Error("async boom");
      }, 100);
      const [syncError] = await withTimeout(() => {
        throw new Error("sync boom");
      }, 100);

      expect(asyncError?.message).toBe("async boom");
      expect(syncError?.message).toBe("sync boom");
    });

    it("should use mapErr for errors thrown by the function", async () => {
      const result = await withTimeout(
        () => Promise.reject(new Error("boom")),
        100,
        () => "FAILED" as const,
      );

      expect(result).toEqual(["FAILED", null]);
      expectTypeOf(result[0]).toEqualTypeOf<"FAILED" | TimeoutError | null>();
    });

    it("should clear the timer when the function finishes", async () => {
      vi.useFakeTimers();

      await withTimeout(async () => 42, 100);

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
