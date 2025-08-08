import { describe, expect, it } from "vitest";
import { Err } from "./result";
import { Result } from "./types";
import { fromThrowable, safe, unsafe } from "./utils";

describe("utils.ts", () => {
  describe("safe", () => {
    it("should return a ResultOk when the function executes successfully", () => {
      const fn = () => "test";
      const [error, value] = safe(fn, "ERROR_LABEL");
      expect(error).toBeNull();
      expect(value).toBe("test");
    });

    it("should return a ResultErr when the function throws an error", () => {
      const error = new Error("Test error");
      const fn = () => {
        throw error;
      };
      const [err, value] = safe(fn, "ERROR_LABEL");
      expect(err).toEqual(new Err("ERROR_LABEL", error));
      expect(value).toBeNull();
    });
  });

  describe("unsafe", () => {
    it("should return the value when the Result is a ResultOk", () => {
      const result: Result<string> = [null, "test"];
      const value = unsafe(result);
      expect(value).toBe("test");
    });

    it("should throw an error when the Result is a ResultErr", () => {
      const err = new Err("ERROR_LABEL");
      const result: Result<string> = [err, null];
      expect(() => unsafe(result)).toThrow(Error);
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
      const [error, value] = safeFn(false);
      expect(error).toBeNull();
      expect(value).toBe("Success!");
    });

    it("should return a ResultErr when the function throws an error", () => {
      const [err, value] = safeFn(true);
      expect(err).toEqual(new Err("ERROR_LABEL", error));
      expect(value).toBeNull();
    });
  });
});
