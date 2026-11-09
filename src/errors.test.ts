import { describe, expect, expectTypeOf, it } from "vitest";

import { TaggedError, TimeoutError } from "./errors";
import { err } from "./shared";
import { mapErr } from "./sync";

class NotFound extends TaggedError("NotFound") {}

class Invalid extends TaggedError("Invalid") {
  constructor(readonly field: string) {
    super(`${field} is invalid`);
  }
}

describe("errors", () => {
  describe("TaggedError", () => {
    it("should create an Error subclass with a tag and name", () => {
      const error = new NotFound("User not found", { cause: 404 });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NotFound);
      expect(error._tag).toBe("NotFound");
      expect(error.name).toBe("NotFound");
      expect(error.message).toBe("User not found");
      expect(error.cause).toBe(404);
      expectTypeOf(error._tag).toEqualTypeOf<"NotFound">();
    });

    it("should support subclasses with their own fields", () => {
      const error = new Invalid("email");

      expect(error._tag).toBe("Invalid");
      expect(error.field).toBe("email");
      expect(error.message).toBe("email is invalid");
    });

    it("should narrow a union of errors by tag", () => {
      function describe(error: NotFound | Invalid): string {
        switch (error._tag) {
          case "NotFound":
            return "not found";
          case "Invalid":
            return `invalid ${error.field}`;
        }
      }

      expect(describe(new NotFound())).toBe("not found");
      expect(describe(new Invalid("name"))).toBe("invalid name");
    });

    it("should work as a result error type", () => {
      const [error] = mapErr(err("missing"), () => new NotFound());

      expect(error?._tag).toBe("NotFound");
    });
  });

  describe("TimeoutError", () => {
    it("should be a tagged error with the time limit", () => {
      const error = new TimeoutError(500);

      expect(error).toBeInstanceOf(Error);
      expect(error._tag).toBe("TimeoutError");
      expect(error.name).toBe("TimeoutError");
      expect(error.ms).toBe(500);
      expect(error.message).toBe("Timed out after 500ms");
    });
  });
});
