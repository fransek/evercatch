import { describe, expect, it } from "vitest";
import { err, ok } from "./result";

describe("Result", () => {
  describe("ok function", () => {
    it("should create successful result", () => {
      const [error, value] = ok("test value");
      expect(error).toBeNull();
      expect(value).toBe("test value");
    });

    it("should create successful result with default null value", () => {
      const [error, value] = ok();
      expect(error).toBeNull();
      expect(value).toBeNull();
    });
  });

  describe("err function", () => {
    it("should create error result from string", () => {
      const [error, value] = err("test error");
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("test error");
      expect(value).toBeNull();
    });

    it("should create error result from Error instance", () => {
      const originalError = new Error("test error");
      const [error, value] = err(originalError);
      expect(error).toBe(originalError);
      expect(value).toBeNull();
    });
  });
});
