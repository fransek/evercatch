import { describe, expect, it, vi } from "vitest";

import { err, ok } from "./shared";
import {
  fromSync,
  fromThrowable,
  tryOr,
  tryOrElse,
  tryOrThrow,
  unwrapOr,
  unwrapOrElse,
  unwrapOrThrow,
} from "./sync";

describe("sync", () => {
  describe("fromSync", () => {
    it("should return ok result when function succeeds", () => {
      expect(fromSync(() => 42)).toEqual([null, 42]);
    });

    it("should return err result when function throws", () => {
      expect(
        fromSync(() => {
          throw new Error("test error");
        }),
      ).toEqual([expect.any(Error), null]);
    });

    it("should handle non-Error throwables", () => {
      const [error] = fromSync(() => {
        throw { message: "test error" };
      });

      expect(error).toBeInstanceOf(Error);
      expect(error?.cause).toEqual({ message: "test error" });
    });

    it("should use mapErr", () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));

      const result = fromSync(() => {
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

    it("should pass mapErr to fromSync", () => {
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
      const getFallback = vi.fn(() => 0);

      expect(unwrapOrElse(ok(42), getFallback)).toBe(42);
      expect(getFallback).not.toHaveBeenCalled();
    });

    it("should return the computed fallback when result is err", () => {
      const error = new Error("test error");
      const getFallback = vi.fn(
        (receivedError: Error) => receivedError.message.length,
      );

      expect(unwrapOrElse(err(error), getFallback)).toBe("test error".length);
      expect(getFallback).toHaveBeenCalledWith(error);
    });

    it("should call the fallback with a falsy error", () => {
      for (const error of [0, "", false, 0n]) {
        const getFallback = vi.fn(() => 1);

        expect(unwrapOrElse(err(error), getFallback)).toBe(1);
        expect(getFallback).toHaveBeenCalledWith(error);
      }
    });
  });

  describe("tryOr", () => {
    it("should return the value when the function succeeds", () => {
      const tapErr = vi.fn();

      expect(tryOr(() => 42, 0, tapErr)).toBe(42);
      expect(tapErr).not.toHaveBeenCalled();
    });

    it("should return the fallback when the function throws", () => {
      expect(
        tryOr(() => {
          throw new Error("test");
        }, 0),
      ).toBe(0);
    });

    it("should call tapErr with the error when the function throws", () => {
      const error = new Error("test");
      const tapErr = vi.fn();

      tryOr(
        () => {
          throw error;
        },
        0,
        tapErr,
      );

      expect(tapErr).toHaveBeenCalledWith(error);
    });

    it("should wrap non-Error throwables before calling tapErr", () => {
      const tapErr = vi.fn();

      tryOr(
        () => {
          throw "original";
        },
        0,
        tapErr,
      );

      const [error] = tapErr.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.cause).toBe("original");
    });
  });

  describe("tryOrElse", () => {
    it("should return the value when the function succeeds without calling fallback", () => {
      const getFallback = vi.fn(() => 0);

      expect(tryOrElse(() => 42, getFallback)).toBe(42);
      expect(getFallback).not.toHaveBeenCalled();
    });

    it("should return the computed fallback when the function throws", () => {
      const error = new Error("Oops");
      const getFallback = vi.fn((e: Error) => e.message.length);

      expect(
        tryOrElse(() => {
          throw error;
        }, getFallback),
      ).toBe(4);
      expect(getFallback).toHaveBeenCalledWith(error);
    });

    it("should wrap non-Error throwables before calling fallback", () => {
      const value = tryOrElse(
        () => {
          throw "original";
        },
        (e) => String(e.cause),
      );

      expect(value).toBe("original");
    });
  });

  describe("tryOrThrow", () => {
    it("should return the value when the function succeeds", () => {
      expect(tryOrThrow(() => 42)).toBe(42);
    });

    it("should rethrow errors as is by default", () => {
      const error = new Error("test");

      expect(() =>
        tryOrThrow(() => {
          throw error;
        }),
      ).toThrow(error);
    });

    it("should wrap non-Error throwables by default", () => {
      try {
        tryOrThrow(() => {
          throw "original";
        });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).cause).toBe("original");
      }
    });

    it("should throw the mapped error", () => {
      const mapErr = vi.fn(() => "MAPPED" as const);

      expect(() =>
        tryOrThrow(() => {
          throw "original";
        }, mapErr),
      ).toThrow("MAPPED");
      expect(mapErr).toHaveBeenCalledWith("original");
    });
  });
});
