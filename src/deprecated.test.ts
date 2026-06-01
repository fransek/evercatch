import { describe, expect, it } from "vitest";

import { fromPromise, unwrapAsyncOrThrow } from "./async";
import { safe, safeAsync, unsafeUnwrap, unsafeUnwrapAsync } from "./deprecated";
import { resultFrom, unwrapOrThrow } from "./sync";

describe("deprecated", () => {
  it("should keep safe pointing to resultFrom", () => {
    expect(safe).toBe(resultFrom);
  });

  it("should keep safeAsync pointing to resultFromPromise", () => {
    expect(safeAsync).toBe(fromPromise);
  });

  it("should keep unsafeUnwrap pointing to unwrapOrThrow", () => {
    expect(unsafeUnwrap).toBe(unwrapOrThrow);
  });

  it("should keep unsafeUnwrapAsync pointing to unwrapAsyncOrThrow", () => {
    expect(unsafeUnwrapAsync).toBe(unwrapAsyncOrThrow);
  });
});
