import { describe, expect, it, vi } from "vitest";

import {
  fromAsyncThrowable,
  fromPromise,
  unwrapAsyncOr,
  unwrapAsyncOrElse,
  unwrapAsyncOrThrow,
} from "./async";
import { err, ok } from "./shared";

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
  });
});
