import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { ResultAsyncChain, ResultChain } from "./chain";
import { TaggedError } from "./errors";
import { err, ok } from "./shared";
import type { Result, ResultAsync, ResultOk } from "./types";
import { Result as R, ResultAsync as RA } from "./types";

class NotFound extends TaggedError("NotFound") {}
class Invalid extends TaggedError("Invalid") {}

type User = { name: string; email: string };

function findUser(id: string): Result<User, NotFound> {
  return id === "1"
    ? ok({ name: "Ada", email: "ADA@example.com" })
    : err(new NotFound(id));
}

async function fetchUser(id: string): ResultAsync<User, NotFound> {
  return findUser(id);
}

function validateEmail(email: string): Result<string, Invalid> {
  return email.includes("@") ? ok(email) : err(new Invalid(email));
}

async function validateEmailAsync(email: string): ResultAsync<string, Invalid> {
  return validateEmail(email);
}

describe("ResultChain", () => {
  it("should chain transforms and give back the tuple", () => {
    const result = R(findUser("1"))
      .andThen((user) => validateEmail(user.email))
      .map((email) => email.toLowerCase())
      .toResult();

    expect(result).toEqual([null, "ada@example.com"]);
    expectTypeOf(result).toEqualTypeOf<
      ResultOk<string> | readonly [NotFound | Invalid, null]
    >();
  });

  it("should short circuit on the first error", () => {
    const map = vi.fn();

    const [error] = R(findUser("2"))
      .andThen((user) => validateEmail(user.email))
      .map(map)
      .toResult();

    expect(error).toBeInstanceOf(NotFound);
    expect(map).not.toHaveBeenCalled();
  });

  it("should be assignable to Result once ended", () => {
    const result: Result<string, NotFound> = R(findUser("1"))
      .map((user) => user.name)
      .toResult();

    expect(result).toEqual([null, "Ada"]);
  });

  it("should transform errors with mapErr", () => {
    const result = R(findUser("2"))
      .mapErr((error) => ({ status: 404, tag: error._tag }))
      .toResult();

    expect(result).toEqual([{ status: 404, tag: "NotFound" }, null]);
    expectTypeOf(result[0]).toEqualTypeOf<{
      status: number;
      tag: "NotFound";
    } | null>();
  });

  it("should recover with orElse", () => {
    const fallback = { name: "Guest", email: "guest@example.com" };

    expect(
      R(findUser("2"))
        .orElse(() => ok(fallback))
        .toResult(),
    ).toEqual([null, fallback]);

    const orElse = vi.fn();
    R(findUser("1")).orElse(orElse);
    expect(orElse).not.toHaveBeenCalled();
  });

  it("should call tap and tapErr without changing the result", () => {
    const tap = vi.fn();
    const tapErr = vi.fn();

    const ok = R(findUser("1")).tap(tap).tapErr(tapErr).toResult();
    expect(ok).toEqual(findUser("1"));
    expect(tap).toHaveBeenCalledWith({
      name: "Ada",
      email: "ADA@example.com",
    });
    expect(tapErr).not.toHaveBeenCalled();

    R(findUser("2")).tap(tap).tapErr(tapErr);
    expect(tap).toHaveBeenCalledOnce();
    expect(tapErr).toHaveBeenCalledWith(expect.any(NotFound));
  });

  it("should end with a value", () => {
    const guest = { name: "Guest", email: "" };

    expect(R(findUser("2")).unwrapOr(guest)).toBe(guest);
    expect(
      R(findUser("2")).unwrapOrElse((error) => ({
        name: error.name,
        email: "",
      })).name,
    ).toBe("NotFound");
    expect(R(findUser("1")).unwrapOrThrow().name).toBe("Ada");
    expect(() => R(findUser("2")).unwrapOrThrow()).toThrow(NotFound);
    expect(
      R(findUser("2")).match({ ok: (user) => user.name, err: () => null }),
    ).toBe(null);
  });

  it("should treat falsy errors as errors", () => {
    const map = vi.fn();

    expect(R(err(0)).map(map).toResult()).toEqual([0, null]);
    expect(R(err("") as Result<number, "">).unwrapOr(1)).toBe(1);
    expect(map).not.toHaveBeenCalled();
  });

  it("should continue asynchronously with toAsync", async () => {
    const chain = R(findUser("1"))
      .toAsync()
      .andThen((user) => validateEmailAsync(user.email));

    expect(chain).toBeInstanceOf(ResultAsyncChain);
    await expect(chain).resolves.toEqual([null, "ADA@example.com"]);
  });

  it("should be constructible directly", () => {
    expect(new ResultChain(ok(1)).toResult()).toEqual([null, 1]);
  });
});

describe("ResultAsyncChain", () => {
  it("should chain sync and async callbacks and await to the tuple", async () => {
    const [error, email] = await RA(fetchUser("1"))
      .andThen((user) => validateEmailAsync(user.email))
      .andThen(validateEmail)
      .map(async (email) => email.toLowerCase())
      .map((email) => email.trim());

    expect(error).toBe(null);
    expect(email).toBe("ada@example.com");
    expectTypeOf(error).toEqualTypeOf<NotFound | Invalid | null>();
    expectTypeOf(email).toEqualTypeOf<string | null>();
  });

  it("should narrow the value after checking the error", async () => {
    const [error, user] = await RA(fetchUser("1"));

    if (error === null) {
      expectTypeOf(user).toEqualTypeOf<User>();
    } else {
      expectTypeOf(user).toEqualTypeOf<null>();
    }
  });

  it("should accept chains returned from callbacks", async () => {
    const result = await RA(fetchUser("1")).andThen((user) =>
      RA(validateEmailAsync(user.email)).map((email) => email.length),
    );

    expect(result).toEqual([null, 15]);
    expectTypeOf(result[1]).toEqualTypeOf<number | null>();
  });

  it("should short circuit on the first error", async () => {
    const map = vi.fn();

    const [error] = await RA(fetchUser("2"))
      .andThen((user) => validateEmail(user.email))
      .map(map);

    expect(error).toBeInstanceOf(NotFound);
    expect(map).not.toHaveBeenCalled();
  });

  it("should be usable as a ResultAsync and a Promise", async () => {
    const chain = RA(fetchUser("1")).map((user) => user.name);
    const asResultAsync: ResultAsync<string, NotFound> = chain;

    expect(Object.prototype.toString.call(chain)).toBe("[object ResultAsync]");
    await expect(asResultAsync).resolves.toEqual([null, "Ada"]);
    await expect(Promise.resolve(chain)).resolves.toEqual([null, "Ada"]);
    await expect(Promise.all([chain, chain])).resolves.toHaveLength(2);
  });

  it("should transform errors with mapErr, sync or async", async () => {
    await expect(
      RA(fetchUser("2")).mapErr(async (error) => error._tag),
    ).resolves.toEqual(["NotFound", null]);
  });

  it("should recover with orElse", async () => {
    const result = await RA(fetchUser("2")).orElse(() => fetchUser("1"));

    expect(result).toEqual([null, { name: "Ada", email: "ADA@example.com" }]);
    expectTypeOf(result[0]).toEqualTypeOf<NotFound | null>();
  });

  it("should await async tap callbacks before continuing", async () => {
    const order: string[] = [];

    await RA(fetchUser("1"))
      .tap(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push("tap");
      })
      .map(() => order.push("map"));

    expect(order).toEqual(["tap", "map"]);
  });

  it("should call tapErr with the error", async () => {
    const tapErr = vi.fn();

    await RA(fetchUser("2")).tapErr(tapErr);

    expect(tapErr).toHaveBeenCalledWith(expect.any(NotFound));
  });

  it("should end with a value", async () => {
    await expect(
      RA(fetchUser("2")).unwrapOr({ name: "Guest", email: "" }),
    ).resolves.toEqual({ name: "Guest", email: "" });
    await expect(
      RA(fetchUser("2")).unwrapOrElse(async () => ({ name: "?", email: "" })),
    ).resolves.toEqual({ name: "?", email: "" });
    await expect(RA(fetchUser("2")).unwrapOrThrow()).rejects.toBeInstanceOf(
      NotFound,
    );
    await expect(
      RA(fetchUser("1")).match({
        ok: async (user) => user.name,
        err: () => "anonymous",
      }),
    ).resolves.toBe("Ada");
  });

  it("should pass rejections through then, catch and finally", async () => {
    const chain = new ResultAsyncChain<number, Error>(
      Promise.reject(new Error("boom")),
    );
    const onFinally = vi.fn();

    await expect(chain.catch((reason) => reason)).resolves.toEqual(
      new Error("boom"),
    );
    await expect(chain.finally(onFinally)).rejects.toThrow("boom");
    expect(onFinally).toHaveBeenCalledOnce();
  });

  it("should reject when a callback throws", async () => {
    await expect(
      RA(fetchUser("1")).map(() => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
