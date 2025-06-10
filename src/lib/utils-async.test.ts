import { describe, expect, it } from "vitest";
import { Err } from "./result";
import { Result } from "./types";
import { fromThrowable, safe, unsafe } from "./utils";

describe("utils-async.ts", () => {
  describe("safe", () => {
    it("should return a ResultOk when the function executes successfully", () => {
      const fn = () => "test";
      const result = safe(fn, "ERROR_LABEL");
      expect(result).toEqual([null, "test"]);
    });

    it("should return a ResultErr when the function throws an error", () => {
      const error = new Error("Test error");
      const fn = () => {
        throw error;
      };
      const result = safe(fn, "ERROR_LABEL");
      expect(result).toEqual([Err.from(error, "ERROR_LABEL"), null]);
    });
  });

  describe("unsafe", () => {
    it("should return the value when the Result is a ResultOk", () => {
      const result: Result<string> = [null, "test"];
      const value = unsafe(result);
      expect(value).toBe("test");
    });

    it("should throw an error when the Result is a ResultErr", () => {
      const result: Result<string> = [new Err("ERROR_LABEL"), null];
      expect(() => unsafe(result)).toThrowError(new Err("ERROR_LABEL"));
    });
  });

  describe("fromThrowable", () => {
    const error = new Error("Error message");

    const fn = (throwError: boolean) => {
      if (throwError) {
        throw error;
      }
      return "Success!";
    };

    const safeFn = fromThrowable(fn, "ERROR_LABEL");

    it("should return a ResultOk when the function executes successfully", () => {
      const result = safeFn(false);
      expect(result).toEqual([null, "Success!"]);
    });

    it("should return a ResultErr when the function throws an error", () => {
      const result = safeFn(true);
      expect(result).toEqual([Err.from(error, "ERROR_LABEL"), null]);
    });
  });
});
