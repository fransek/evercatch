import { describe, expect, it } from "vitest";
import { Err, err, ok } from "./result";

describe("result.ts", () => {
  describe("Err", () => {
    it("should create an Err with the provided label and message", () => {
      const error = new Err("ERROR_LABEL", "Error message");
      expect(error.label).toBe("ERROR_LABEL");
      expect(error.message).toBe("Error message");
    });

    it("should create an Err with only a label", () => {
      const error = new Err("ERROR_LABEL");
      expect(error.label).toBe("ERROR_LABEL");
      expect(error.message).toBe("");
    });

    it("should create an Err from an Error object", () => {
      const error = new Error("Original error message");
      const err = Err.from(error, "ERROR_LABEL");
      expect(err.label).toBe("ERROR_LABEL");
      expect(err.message).toBe(error.message);
      expect(err.cause).toBe(error.cause);
      expect(err.stack).toBe(error.stack);
      expect(err.name).toBe(error.name);
      expect(err.source).toBe(error);
    });

    it("should create an Err from a string", () => {
      const err = Err.from("error", "ERROR_LABEL");
      expect(err.label).toBe("ERROR_LABEL");
      expect(err.message).toBe("error");
      expect(err.cause).toBeUndefined();
      expect(err.stack).toBeDefined();
      expect(err.name).toBe("Error");
      expect(err.source).toBe("error");
    });

    it("should create an Err from an object", () => {
      const err = Err.from({ message: "error" }, "ERROR_LABEL");
      expect(err.label).toBe("ERROR_LABEL");
      expect(err.message).toBe('{"message":"error"}');
      expect(err.source).toEqual({ message: "error" });
    });

    it("should create an Err from an unserializable object", () => {
      const err = Err.from(0n, "ERROR_LABEL");
      expect(err.label).toBe("ERROR_LABEL");
      expect(err.message).toBe("");
      expect(err.source).toBe(0n);
    });

    it("should create a ResultErr from an unknown value", () => {
      const error = new Error("Error message");
      const [err, val] = Err.resultFrom(error, "ERROR_LABEL");
      expect(err.label).toBe("ERROR_LABEL");
      expect(err.message).toBe("Error message");
      expect(err.source).toBe(error);
      expect(val).toBeNull();
    });
  });

  describe("ok", () => {
    it("should return a ResultOk with the provided value", () => {
      const result = ok("test");
      expect(result).toEqual([null, "test"]);
    });

    it("should return a ResultOk with null if no value is provided", () => {
      const result = ok();
      expect(result).toEqual([null, null]);
    });
  });

  describe("err", () => {
    it("should return a ResultErr with the provided description", () => {
      const result = err("ERROR_LABEL");
      expect(result).toEqual([new Err("ERROR_LABEL"), null]);
    });

    it("should return a ResultErr with the provided Err object", () => {
      const errorObj = new Err("ERROR_LABEL", "Error message");
      const result = err(errorObj);
      expect(result).toEqual([errorObj, null]);
    });
  });
});
