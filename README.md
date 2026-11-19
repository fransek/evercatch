# Evercatch

[![Version](https://img.shields.io/npm/v/evercatch)](https://npmjs.com/package/evercatch)
[![Downloads](https://img.shields.io/npm/dm/evercatch.svg)](https://npmjs.com/package/evercatch)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/evercatch)](https://bundlephobia.com/package/evercatch)

No more uncaught errors!

Evercatch is a tiny, dependency-free TypeScript library that turns thrown errors
into values. Errors become part of a function's return type, so the compiler
tells you where they are and refuses to let you read a value you haven't checked
for yet.

```bash
npm install evercatch
# or
yarn add evercatch
# or
pnpm add evercatch
```

## The result tuple

Everything is built on one type: a readonly tuple of `[error, value]`.

```typescript
type Result<T, E> = readonly [null, T] | readonly [E, null];
```

Destructure it, check the error, and TypeScript narrows the value for you:

```typescript
import { Result } from "evercatch";

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return Result.err(new Error("Division by zero"));
  return Result.ok(a / b);
}

const [error, value] = divide(10, 2);

if (error) {
  console.error(error.message);
} else {
  console.log(value); // number — narrowed, not number | null
}
```

`null` in the error slot means "this result is ok", so an error can never be
nullish. Every error type in the library is constrained to reject `null` and
`undefined` at compile time.

Falsy errors like `0`, `""` or `false` are allowed, though. If your error type
can be falsy, check `error !== null` instead of `if (error)`.

`Result` is both the type and a namespace holding the functions that work with
it, so a single import gives you both. The same goes for `ResultAsync`,
`ResultFn` and `ResultAsyncFn`.

## Catching what throws

Wrap a call that might throw and get a result back instead.

```typescript
import { Result, ResultAsync } from "evercatch";
import { raw } from "./input";

const [parseError, config] = Result.from(() => JSON.parse(raw));

const [fetchError, response] = await ResultAsync.from(
  fetch("https://api.example.com/data"),
);
```

Or wrap the function once and reuse the safe version:

```typescript
import { ResultAsyncFn, ResultFn } from "evercatch";
import { raw } from "./input";

const safeParse = ResultFn.from(JSON.parse);
const safeFetch = ResultAsyncFn.from(fetch);

const [error, data] = safeParse(raw);
const [fetchError, response] = await safeFetch("https://api.example.com/data");
```

Anything thrown that isn't an `Error` is wrapped in one, with the original value
kept as `cause`.

## Custom error types

Every catching function takes an optional `mapErr` to turn the caught value into
an error type of your choosing — a string union, a tagged object, your own error
class. Whatever you return becomes the error type of the result.

```typescript
import { ResultAsync } from "evercatch";

type FetchError = "NETWORK_ERROR" | "TIMEOUT";

const [error, response] = await ResultAsync.from(
  fetch("https://api.example.com/data"),
  (e): FetchError => (e instanceof DOMException ? "TIMEOUT" : "NETWORK_ERROR"),
);

if (error === "TIMEOUT") {
  // ...
}
```

## Unwrapping

When you'd rather not handle the error at the call site, unwrap the result with
a fallback — or throw after all.

```typescript
import { Result } from "evercatch";
import { divide } from "./divide";

Result.unwrapOr(divide(10, 0), 0); // 0
Result.unwrapOrElse(divide(10, 0), (error) => error.message.length); // computed
Result.unwrapOrThrow(divide(10, 0)); // throws the error
```

`ResultAsync` has the same three, taking a `Promise` of a result and returning
a promise:

```typescript
import { ResultAsync } from "evercatch";
import { fallbackUser, fetchUserData } from "./user";

await ResultAsync.unwrapOr(fetchUserData(), fallbackUser);
```

To catch and unwrap in one step, without a result in between, use the `try`
functions. `tryOr` takes an optional third argument that sees the error before
it is discarded, which is handy for logging, and `tryOrThrow` takes a `mapErr`
to turn whatever was thrown into an error of your own before rethrowing it:

```typescript
import { Result, ResultAsync } from "evercatch";
import { ConfigError } from "./errors";
import { raw } from "./input";
import { fetchUsers } from "./user";

const config = Result.tryOr(
  () => JSON.parse(raw),
  {},
  (error) => console.warn("Invalid config, using defaults", error),
);

const users = await ResultAsync.tryOrElse(fetchUsers(), () => []);

const strictConfig = Result.tryOrThrow(
  () => JSON.parse(raw),
  (error) => new ConfigError("Invalid config", { cause: error }),
);
```

## Composing

Results compose by returning early. Errors travel upward as values, so a
function that can fail has a signature that says so.

```typescript
import { Result, ResultAsync } from "evercatch";
import { auth } from "./auth";
import type { UserData } from "./types";

async function fetchUserData(): ResultAsync<UserData, Error> {
  const [authError, user] = await ResultAsync.from(auth());
  if (authError) return Result.err(authError);

  const [fetchError, response] = await ResultAsync.from(
    fetch(`https://api.example.com/user/${user.id}`),
  );
  if (fetchError) return Result.err(fetchError);
  if (!response.ok) return Result.err(new Error("Failed to fetch user data"));

  return await ResultAsync.from(response.json());
}
```

## Generators

When a function has many fallible steps, the early returns pile up.
`Result.gen` runs a generator in which `yield* Result.bind(result)` unwraps a
result to its value. The first error stops the body and becomes the outcome,
so the steps read like straight-line code:

```typescript
import { Result, ResultAsync } from "evercatch";
import { auth } from "./auth";
import type { UserData } from "./types";

async function fetchUserData(): ResultAsync<UserData, Error> {
  return ResultAsync.gen(async function* () {
    const user = yield* ResultAsync.bindFrom(auth());
    const response = yield* ResultAsync.bindFrom(
      fetch(`https://api.example.com/user/${user.id}`),
    );
    if (!response.ok) return Result.err(new Error("Failed to fetch user data"));

    return await ResultAsync.from<UserData>(response.json());
  });
}
```

The `bindFrom` helpers catch and bind in one step, taking an optional `mapErr`
just like `from`:

| Helper                    | Shorthand for                            |
| ------------------------- | ---------------------------------------- |
| `Result.bindFrom(fn)`     | `Result.bind(Result.from(fn))`           |
| `ResultAsync.bind(p)`     | `Result.bind(await p)`                   |
| `ResultAsync.bindFrom(p)` | `Result.bind(await ResultAsync.from(p))` |

The `ResultAsync` ones only work inside `ResultAsync.gen`.

The body returns a result of its own, ok or err, and the error type of the
whole thing is the union of every error the body can produce. `finally` blocks
still run when an error cuts the body short. Anything the body throws is not
caught, so run throwing calls through `bindFrom`.

Use `Result.gen` with a plain `function*` for sync code, and
`ResultAsync.gen` with an `async function*` when you need to `await`.

To define a function with a generator body, use `ResultFn.gen` or
`ResultAsyncFn.gen`. Arguments are passed through to the body, and the body
runs anew on every call:

```typescript
import { Result, ResultAsync, ResultAsyncFn } from "evercatch";
import type { UserData } from "./types";

const fetchUserData = ResultAsyncFn.gen(async function* (id: string) {
  const response = yield* ResultAsync.bindFrom(
    fetch(`https://api.example.com/user/${id}`),
  );
  if (!response.ok) return Result.err(new Error("Failed to fetch user data"));

  return await ResultAsync.from<UserData>(response.json());
});

const [error, user] = await fetchUserData("42");
```

## Inferring types

`InferOk` and `InferErr` pull the value and error types out of a result, an
async result, or a function that returns either, so you don't have to spell
them out twice.

```typescript
import { ResultFn, type InferErr, type InferOk } from "evercatch";
import type { Config } from "./types";
import { fetchUserData } from "./user";

const safeParse = ResultFn.from((raw: string): Config => JSON.parse(raw));

type Parsed = InferOk<typeof safeParse>; // Config
type ParseError = InferErr<typeof safeParse>; // Error

// Works on the async function from the section above, too
type FetchUserError = InferErr<typeof fetchUserData>; // Error
type FetchUserData = InferOk<typeof fetchUserData>; // UserData
```

Promises are unwrapped for you, and a result that can never fail has the error
type `never`.

## Standalone exports

Every namespace member is also exported on its own. They are the same
functions, so this is mostly a matter of preference, but importing them
individually lets your bundler drop the ones you don't use. Standalone names
that work on promises have `Async` right after the verb, as in `unwrapAsyncOr`,
since there is no namespace to say so.

| Namespace                   | Standalone           |
| --------------------------- | -------------------- |
| `Result.ok`                 | `ok`                 |
| `Result.err`                | `err`                |
| `Result.from`               | `fromSync`           |
| `Result.unwrapOr`           | `unwrapOr`           |
| `Result.unwrapOrElse`       | `unwrapOrElse`       |
| `Result.unwrapOrThrow`      | `unwrapOrThrow`      |
| `Result.tryOr`              | `tryOr`              |
| `Result.tryOrElse`          | `tryOrElse`          |
| `Result.tryOrThrow`         | `tryOrThrow`         |
| `Result.gen`                | `genSync`            |
| `Result.bind`               | `bind`               |
| `Result.bindFrom`           | `bindFrom`           |
| `ResultAsync.from`          | `fromAsync`          |
| `ResultAsync.unwrapOr`      | `unwrapAsyncOr`      |
| `ResultAsync.unwrapOrElse`  | `unwrapAsyncOrElse`  |
| `ResultAsync.unwrapOrThrow` | `unwrapAsyncOrThrow` |
| `ResultAsync.tryOr`         | `tryAsyncOr`         |
| `ResultAsync.tryOrElse`     | `tryAsyncOrElse`     |
| `ResultAsync.tryOrThrow`    | `tryAsyncOrThrow`    |
| `ResultAsync.gen`           | `genAsync`           |
| `ResultAsync.bind`          | `bindAsync`          |
| `ResultAsync.bindFrom`      | `bindAsyncFrom`      |
| `ResultFn.from`             | `fromThrowable`      |
| `ResultFn.gen`              | `genFn`              |
| `ResultAsyncFn.from`        | `fromAsyncThrowable` |
| `ResultAsyncFn.gen`         | `genAsyncFn`         |

## Documentation

Full API reference: [fransek.github.io/evercatch](https://fransek.github.io/evercatch/)

## License

MIT
