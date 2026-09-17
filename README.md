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
import { err, ok, type Result } from "evercatch";

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return err(new Error("Division by zero"));
  }
  return ok(a / b);
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

## Catching what throws

Wrap a call that might throw and get a result back instead.

```typescript
import { fromPromise, resultFrom } from "evercatch";

const [parseError, config] = resultFrom(() => JSON.parse(raw));

const [fetchError, response] = await fromPromise(
  fetch("https://api.example.com/data"),
);
```

Or wrap the function once and reuse the safe version:

```typescript
import { fromAsyncThrowable, fromThrowable } from "evercatch";

const safeParse = fromThrowable(JSON.parse);
const safeFetch = fromAsyncThrowable(fetch);

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
import { fromPromise } from "evercatch";

type FetchError = "NETWORK_ERROR" | "TIMEOUT";

const [error, response] = await fromPromise(
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
import { unwrapOr, unwrapOrElse, unwrapOrThrow } from "evercatch";

unwrapOr(divide(10, 0), 0); // 0
unwrapOrElse(divide(10, 0), (error) => error.message.length); // computed
unwrapOrThrow(divide(10, 0)); // throws the error
```

The async variants take a `Promise` of a result and return a promise:
`unwrapAsyncOr`, `unwrapAsyncOrElse` and `unwrapAsyncOrThrow`.

## Composing

Results compose by returning early. Errors travel upward as values, so a
function that can fail has a signature that says so.

```typescript
import { err, fromPromise, ok, type ResultAsync } from "evercatch";
import { auth } from "./auth";

async function fetchUserData(): ResultAsync<UserData, Error> {
  const [authError, user] = await fromPromise(auth());
  if (authError) {
    return err(authError);
  }

  const [fetchError, response] = await fromPromise(
    fetch(`https://api.example.com/user/${user.id}`),
  );
  if (fetchError) {
    return err(fetchError);
  }
  if (!response.ok) {
    return err(new Error("Failed to fetch user data"));
  }

  return await fromPromise(response.json());
}
```

## Namespaces

The same functions are also grouped under the type they work with, which makes
for shorter names at the call site. This is purely a matter of preference — the
namespace members and the standalone exports are the same functions.

```typescript
import { Result, ResultAsync, ResultAsyncFn, ResultFn } from "evercatch";

Result.ok(42);
Result.from(() => JSON.parse(raw));
Result.unwrapOr(someResult, 0);

await ResultAsync.from(fetch(url));

const safeParse = ResultFn.from(JSON.parse);
const safeFetch = ResultAsyncFn.from(fetch);
```

Note that `Result`, `ResultAsync`, `ResultFn` and `ResultAsyncFn` are each both a
type and a value, so a single import gives you both.

## Documentation

Full API reference: [fransek.github.io/evercatch](https://fransek.github.io/evercatch/)

## License

MIT
