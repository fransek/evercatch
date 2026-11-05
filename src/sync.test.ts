import { describe, expect, it, vi } from "vitest";

import { err, ok } from "./shared";
import {
  fromThrowable,
  resultFrom,
  unwrapOr,
  unwrapOrElse,
  unwrapOrThrow,
} from "./sync";

describe("sync", () => {
  describe("resultFrom", () => {
    it("should return ok result when function succeeds", () => {
      expect(resultFrom(() => 42)).toEqual([null, 42]);
    });

    it("should return err result when function throws", () => {
      expect(
        resultFrom(() => {
          throw new Error("test error");
        }),
      ).toEqual([expect.any(Error), null]);
    });

    it("should handle non-Error throwables", () => {
      const [error] = resultFrom(() => {
        throw { message: "test error" };
      });

      expect(error).toBeInstanceOf(Error);
      expect(error?.cause).toEqual({ message: "test error" });
    });

    it("should use mapErr", () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));

      const result = resultFrom(() => {
        throw "original";
      }, mapErr);

      expect(result).toEqual([expect.any(Error), null]);
      expect(mapErr).toHaveBeenCalledWith("original");
    });
  });

  describe("fromThrowable", () => {
    it("should wrap a function to return Result", () => {
      const wrapped = fromThrowable((value: number) => value * 2);
      expect(wrapped(5)).toEqual([null, 10]);
    });

    it("should catch errors in wrapped function", () => {
      const wrapped = fromThrowable(() => {
        throw new Error("test");
      });

      expect(wrapped()).toEqual([expect.any(Error), null]);
    });

    it("should pass mapErr to resultFrom", () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));
      const wrapped = fromThrowable(() => {
        throw "test";
      }, mapErr);

      expect(wrapped()).toEqual([expect.any(Error), null]);
      expect(mapErr).toHaveBeenCalledWith("test");
    });
  });

  describe("unwrapOrThrow", () => {
    it("should return the value when result is ok", () => {
      expect(unwrapOrThrow(ok(42))).toBe(42);
    });

    it("should throw the error when result is err", () => {
      const error = new Error("test error");
      expect(() => unwrapOrThrow(err(error))).toThrow(error);
    });

    it("should throw falsy errors that are not nullish", () => {
      for (const error of [0, "", false, 0n]) {
        expect(() => unwrapOrThrow(err(error))).toThrow();
        try {
          unwrapOrThrow(err(error));
        } catch (thrown) {
          expect(thrown).toBe(error);
        }
      }
    });
  });

  describe("unwrapOr", () => {
    it("should return the value when result is ok", () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it("should return the fallback when result is err", () => {
      expect(unwrapOr(err(new Error("test error")), 0)).toBe(0);
    });

    it("should return the fallback when the error is falsy", () => {
      for (const error of [0, "", false, 0n]) {
        expect(unwrapOr(err(error), 1)).toBe(1);
      }
    });
  });

  describe("unwrapOrElse", () => {
    it("should return the value when result is ok without calling fallback", () => {
      const fallbackFn = vi.fn(() => 0);

      expect(unwrapOrElse(ok(42), fallbackFn)).toBe(42);
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it("should return the computed fallback when result is err", () => {
      const error = new Error("test error");
      const fallbackFn = vi.fn(
        (receivedError: Error) => receivedError.message.length,
      );

      expect(unwrapOrElse(err(error), fallbackFn)).toBe("test error".length);
      expect(fallbackFn).toHaveBeenCalledWith(error);
    });

    it("should call the fallback with a falsy error", () => {
      for (const error of [0, "", false, 0n]) {
        const fallbackFn = vi.fn(() => 1);

        expect(unwrapOrElse(err(error), fallbackFn)).toBe(1);
        expect(fallbackFn).toHaveBeenCalledWith(error);
      }
    });
  });
});
