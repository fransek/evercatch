import { describe, expect, it, vi } from "vitest";

import {
  fromAsync,
  fromThrowableAsync,
  tryOrAsync,
  tryOrElseAsync,
  tryOrThrowAsync,
  unwrapOrAsync,
  unwrapOrElseAsync,
  unwrapOrThrowAsync,
} from "./async";
import { err, ok } from "./shared";

describe("async", () => {
  describe("fromAsync", () => {
    it("should return ok result when promise resolves", async () => {
      await expect(fromAsync(Promise.resolve(42))).resolves.toEqual([null, 42]);
    });

    it("should return err result when promise rejects", async () => {
      await expect(
        fromAsync(Promise.reject(new Error("test error"))),
      ).resolves.toEqual([expect.any(Error), null]);
    });

    it("should use mapErr", async () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));

      const result = await fromAsync(Promise.reject("original"), mapErr);

      expect(result).toEqual([expect.any(Error), null]);
      expect(mapErr).toHaveBeenCalledWith("original");
    });
  });

  describe("fromThrowableAsync", () => {
    it("should wrap an async function to return ResultAsync", async () => {
      const wrapped = fromThrowableAsync(async (value: number) => value * 2);
      await expect(wrapped(5)).resolves.toEqual([null, 10]);
    });

    it("should catch errors in wrapped async function", async () => {
      const wrapped = fromThrowableAsync(async () => {
        throw new Error("test");
      });

      await expect(wrapped()).resolves.toEqual([expect.any(Error), null]);
    });

    it("should pass mapErr to fromAsync", async () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));
      const wrapped = fromThrowableAsync(async () => {
        throw "test";
      }, mapErr);

      await expect(wrapped()).resolves.toEqual([expect.any(Error), null]);
      expect(mapErr).toHaveBeenCalledWith("test");
    });
  });

  describe("unwrapOrThrowAsync", () => {
    it("should return the value when result is ok", async () => {
      await expect(unwrapOrThrowAsync(Promise.resolve(ok(42)))).resolves.toBe(
        42,
      );
    });

    it("should throw the error when result is err", async () => {
      const error = new Error("test error");
      await expect(
        unwrapOrThrowAsync(Promise.resolve(err(error))),
      ).rejects.toThrow(error);
    });

    it("should reject with falsy errors that are not nullish", async () => {
      for (const error of [0, "", false, 0n]) {
        await expect(
          unwrapOrThrowAsync(Promise.resolve(err(error))),
        ).rejects.toBe(error);
      }
    });
  });

  describe("unwrapOrAsync", () => {
    it("should return the value when result is ok", async () => {
      await expect(unwrapOrAsync(Promise.resolve(ok(42)), 0)).resolves.toBe(42);
    });

    it("should return the fallback when result is err", async () => {
      await expect(
        unwrapOrAsync(Promise.resolve(err(new Error("test error"))), 0),
      ).resolves.toBe(0);
    });

    it("should return the fallback when the error is falsy", async () => {
      for (const error of [0, "", false, 0n]) {
        await expect(
          unwrapOrAsync(Promise.resolve(err(error)), 1),
        ).resolves.toBe(1);
      }
    });
  });

  describe("unwrapOrElseAsync", () => {
    it("should return the value when result is ok without calling fallback", async () => {
      const getFallback = vi.fn(() => 0);

      await expect(
        unwrapOrElseAsync(Promise.resolve(ok(42)), getFallback),
      ).resolves.toBe(42);
      expect(getFallback).not.toHaveBeenCalled();
    });

    it("should return the computed fallback when result is err", async () => {
      const error = new Error("test error");
      const getFallback = vi.fn(
        (receivedError: Error) => receivedError.message.length,
      );

      await expect(
        unwrapOrElseAsync(Promise.resolve(err(error)), getFallback),
      ).resolves.toBe("test error".length);
      expect(getFallback).toHaveBeenCalledWith(error);
    });

    it("should call the fallback with a falsy error", async () => {
      for (const error of [0, "", false, 0n]) {
        const getFallback = vi.fn(() => 1);

        await expect(
          unwrapOrElseAsync(Promise.resolve(err(error)), getFallback),
        ).resolves.toBe(1);
        expect(getFallback).toHaveBeenCalledWith(error);
      }
    });
  });

  describe("tryOrAsync", () => {
    it("should return the value when the promise resolves", async () => {
      const tapErr = vi.fn();

      await expect(tryOrAsync(Promise.resolve(42), 0, tapErr)).resolves.toBe(
        42,
      );
      expect(tapErr).not.toHaveBeenCalled();
    });

    it("should return the fallback when the promise rejects", async () => {
      await expect(
        tryOrAsync(Promise.reject(new Error("test")), 0),
      ).resolves.toBe(0);
    });

    it("should call tapErr with the error when the promise rejects", async () => {
      const error = new Error("test");
      const tapErr = vi.fn();

      await tryOrAsync(Promise.reject(error), 0, tapErr);

      expect(tapErr).toHaveBeenCalledWith(error);
    });

    it("should wrap non-Error rejections before calling tapErr", async () => {
      const tapErr = vi.fn();

      await tryOrAsync(Promise.reject("original"), 0, tapErr);

      const [error] = tapErr.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.cause).toBe("original");
    });
  });

  describe("tryOrElseAsync", () => {
    it("should return the value when the promise resolves without calling fallback", async () => {
      const getFallback = vi.fn(() => 0);

      await expect(
        tryOrElseAsync(Promise.resolve(42), getFallback),
      ).resolves.toBe(42);
      expect(getFallback).not.toHaveBeenCalled();
    });

    it("should return the computed fallback when the promise rejects", async () => {
      const error = new Error("Oops");
      const getFallback = vi.fn((e: Error) => e.message.length);

      await expect(
        tryOrElseAsync(Promise.reject(error), getFallback),
      ).resolves.toBe(4);
      expect(getFallback).toHaveBeenCalledWith(error);
    });
  });

  describe("tryOrThrowAsync", () => {
    it("should return the value when the promise resolves", async () => {
      await expect(tryOrThrowAsync(Promise.resolve(42))).resolves.toBe(42);
    });

    it("should reject with the error as is by default", async () => {
      const error = new Error("test");

      await expect(tryOrThrowAsync(Promise.reject(error))).rejects.toBe(error);
    });

    it("should wrap non-Error rejections by default", async () => {
      const promise = tryOrThrowAsync(Promise.reject("original"));

      await expect(promise).rejects.toBeInstanceOf(Error);
      await expect(promise).rejects.toHaveProperty("cause", "original");
    });

    it("should reject with the mapped error", async () => {
      const mapErr = vi.fn(() => "MAPPED" as const);

      await expect(
        tryOrThrowAsync(Promise.reject("original"), mapErr),
      ).rejects.toBe("MAPPED");
      expect(mapErr).toHaveBeenCalledWith("original");
    });
  });
});
