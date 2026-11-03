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

Every namespace member is also exported on its own, under a longer name. They
are the same functions, so this is mostly a matter of preference, but importing
them individually lets your bundler drop the ones you don't use.

| Namespace                   | Standalone           |
| --------------------------- | -------------------- |
| `Result.ok`                 | `ok`                 |
| `Result.err`                | `err`                |
| `Result.from`               | `resultFrom`         |
| `Result.unwrapOr`           | `unwrapOr`           |
| `Result.unwrapOrElse`       | `unwrapOrElse`       |
| `Result.unwrapOrThrow`      | `unwrapOrThrow`      |
| `ResultAsync.from`          | `fromPromise`        |
| `ResultAsync.unwrapOr`      | `unwrapAsyncOr`      |
| `ResultAsync.unwrapOrElse`  | `unwrapAsyncOrElse`  |
| `ResultAsync.unwrapOrThrow` | `unwrapAsyncOrThrow` |
| `ResultFn.from`             | `fromThrowable`      |
| `ResultAsyncFn.from`        | `fromAsyncThrowable` |

## Documentation

Full API reference: [fransek.github.io/evercatch](https://fransek.github.io/evercatch/)

## License

MIT
