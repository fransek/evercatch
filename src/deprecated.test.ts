import { describe, expect, expectTypeOf, it } from "vitest";
import * as asyncFns from "./async";
import type { NotNullish } from "./deprecated";
import * as deprecated from "./deprecated";
import * as syncFns from "./sync";
import type { NonNullishError } from "./types";

describe("deprecated aliases", () => {
  it.each([
    ["resultFrom", syncFns.fromSync],
    ["fromPromise", asyncFns.fromAsync],
    ["fromAsyncThrowable", asyncFns.fromThrowableAsync],
    ["unwrapAsyncOr", asyncFns.unwrapOrAsync],
    ["unwrapAsyncOrElse", asyncFns.unwrapOrElseAsync],
    ["unwrapAsyncOrThrow", asyncFns.unwrapOrThrowAsync],
    ["tryPromiseOr", asyncFns.tryOrAsync],
    ["tryPromiseOrElse", asyncFns.tryOrElseAsync],
    ["tryPromiseOrThrow", asyncFns.tryOrThrowAsync],
  ] as const)("%s is the renamed function", (name, fn) => {
    expect(deprecated[name]).toBe(fn);
  });

  it("NotNullish is NonNullishError", () => {
    expectTypeOf<NotNullish<Error>>().toEqualTypeOf<NonNullishError<Error>>();
    expectTypeOf<NotNullish<Error | null>>().toEqualTypeOf<never>();
  });
});
