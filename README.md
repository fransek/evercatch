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
`ResultFn` and `ResultAsyncFn`. `Result` and `ResultAsync` can also be called
with a result, to wrap it for [chaining](#chaining).

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
a fallback — or throw after all. Calling `Result` with a result wraps it in a
chain, and the chain's unwrap methods give you the value.

```typescript
import { Result } from "evercatch";
import { divide } from "./divide";

Result(divide(10, 0)).unwrapOr(0); // 0
Result(divide(10, 0)).unwrapOrElse((error) => error.message.length); // computed
Result(divide(10, 0)).unwrapOrThrow(); // throws the error
```

`ResultAsync` works the same way for a promise of a result, and returns a
promise:

```typescript
import { ResultAsync } from "evercatch";
import { fallbackUser, fetchUserData } from "./user";

await ResultAsync(fetchUserData()).unwrapOr(fallbackUser);
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

## Chaining

For a sequence of transforms, chaining can read better than returning early.
Call `Result` with a result, chain the steps, and end with `toResult()` to get
the tuple back, or with `unwrapOr` or `match` to get a value.

```typescript
import { Result } from "evercatch";
import { parseConfig, validate } from "./config";

const [error, port] = Result(parseConfig(raw))
  .andThen(validate) // a step that can fail itself; the error types add up
  .map((config) => config.port)
  .toResult(); // error: ParseError | ValidationError | null

const message = Result(divide(10, 2)).match({
  ok: (value) => `Result: ${value}`,
  err: (error) => `Failed: ${error.message}`,
});
```

Async chains are where this shines. `ResultAsync(...)` takes a result or an
async result, and the chain is itself a promise of a result, so awaiting it
gives you the tuple. Callbacks can be sync or async, and can return results or
async results.

```typescript
import { ResultAsync } from "evercatch";
import { fetchUser, validateEmail } from "./user";

const [error, email] = await ResultAsync(fetchUser(id))
  .andThen((user) => validateEmail(user.email))
  .map((email) => email.toLowerCase())
  .mapErr((e) => ({ status: e._tag === "NotFound" ? 404 : 400 }));
```

Every function under the `ResultAsync` namespace, such as `ResultAsync.from`,
returns a chain already, and so do functions wrapped with `ResultAsyncFn.from`:

```typescript
const [error, data] = await ResultAsync.from(fetch(url))
  .andThen((response) => ResultAsync.from(response.json()))
  .tapErr((error) => console.error(error))
  .mapErr(() => "NETWORK_ERROR" as const);
```

A chain can be used anywhere a `ResultAsync` is expected, including as the
return value of an `async` function. A sync chain continues asynchronously with
`toAsync()`.

| Method                                      | What it does                                             |
| ------------------------------------------- | -------------------------------------------------------- |
| `map`                                       | Transforms the value                                     |
| `mapErr`                                    | Transforms the error                                     |
| `andThen`                                   | Chains a step that returns a result                      |
| `orElse`                                    | Recovers from an error with a step that returns a result |
| `tap`, `tapErr`                             | Runs a side effect, such as logging, keeping the result  |
| `match`                                     | Ends the chain, handling both outcomes                   |
| `unwrapOr`, `unwrapOrElse`, `unwrapOrThrow` | Ends the chain with the value                            |
| `toResult`                                  | Ends a sync chain with the tuple                         |
| `toAsync`                                   | Continues a sync chain asynchronously                    |

If you use ESLint's `new-cap` rule with `capIsNew`, add `Result` and
`ResultAsync` to its `capIsNewExceptions`.

## Combining

`all` turns several results into one: every value, or the first error.
Tuples keep their shape, so each value keeps its type. `collect` does the same,
but gathers every error instead of stopping at the first, which suits
validation.

```typescript
import { Result, ResultAsync } from "evercatch";

const [error, values] = await ResultAsync.all([fetchUser(id), fetchPosts(id)]);
if (!error) {
  const [user, posts] = values; // [User, Post[]]
}

const [problems] = Result.collect([validateName(name), validateEmail(email)]);
// problems: string[] | null
```

`ResultAsync.all` and `ResultAsync.collect` wait for every result concurrently,
and take plain results too.

## Generators

`gen` removes the `if (error) return Result.err(error)` lines from a long
sequence of steps. Inside the block, `yield* $(result)` gives you the value of
an ok result, or stops the block and returns the error. The error type is the
union of everything that can be yielded.

```typescript
import { ResultAsync } from "evercatch";
import { auth, fetchUser } from "./user";

const [error, profile] = await ResultAsync.gen(async function* ($) {
  const session = yield* $(auth());
  const user = yield* $(fetchUser(session.userId));
  return user.profile;
});
```

`Result.gen` is the sync version. `finally` blocks run when the block stops
early. Thrown errors are not caught, so wrap code that might throw with
`Result.from` or `ResultAsync.from` first.

## Tagged errors

`TaggedError` creates an Error base class with a literal `_tag`, so a union of
errors can be narrowed with a `switch`, and TypeScript checks that every case
is handled.

```typescript
import { TaggedError } from "evercatch";

class NotFound extends TaggedError("NotFound") {}

class Invalid extends TaggedError("Invalid") {
  constructor(readonly field: string) {
    super(`${field} is invalid`);
  }
}

function describe(error: NotFound | Invalid) {
  switch (error._tag) {
    case "NotFound":
      return "Not found";
    case "Invalid":
      return `Check ${error.field}`;
  }
}
```

## Retries and timeouts

`ResultAsync.retry` calls a result-returning function until it succeeds, runs
out of attempts or `shouldRetry` says no. `ResultAsync.withTimeout` gives an
operation a time limit, aborting its signal and returning a `TimeoutError` when
it runs over.

```typescript
import { ResultAsync, ResultAsyncFn, TimeoutError } from "evercatch";

const safeFetch = ResultAsyncFn.from(fetch);

const [error, response] = await ResultAsync.retry(
  () => safeFetch("https://api.example.com/data"),
  { attempts: 5, delay: (attempt) => 100 * 2 ** attempt },
);

const [timeoutError] = await ResultAsync.withTimeout(
  (signal) => fetch("https://api.example.com/data", { signal }),
  5000,
);
if (timeoutError instanceof TimeoutError) {
  // ...
}
```

## Nullable values and type guards

`fromNullable` turns a possibly missing value into a result, and `toNullable`
goes the other way.

```typescript
import { Result } from "evercatch";

const [error, user] = Result.fromNullable(users.get(id), "NOT_FOUND" as const);
const config = Result.toNullable(Result.from(() => JSON.parse(raw)));
```

`isOk` and `isErr` are type guards for when you're not destructuring, such as
filtering a list of results:

```typescript
const values = results.filter(Result.isOk).map(([, value]) => value);
const errors = results.filter(Result.isErr).map(([error]) => error);
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

Everything is also exported as a plain function, under a longer name. Importing
them individually lets your bundler drop the ones you don't use, and suits a
functional style where a chain would be one step too many.

Namespace members are the same functions as their standalone versions, except
that the `ResultAsync` ones return chains, where the standalone ones return
plain promises.

| Namespace                 | Standalone           |
| ------------------------- | -------------------- |
| `Result.ok`               | `ok`                 |
| `Result.err`              | `err`                |
| `Result.isOk`             | `isOk`               |
| `Result.isErr`            | `isErr`              |
| `Result.from`             | `resultFrom`         |
| `Result.all`              | `all`                |
| `Result.collect`          | `collect`            |
| `Result.gen`              | `gen`                |
| `Result.fromNullable`     | `fromNullable`       |
| `Result.toNullable`       | `toNullable`         |
| `ResultAsync.from`        | `fromPromise`        |
| `ResultAsync.all`         | `allAsync`           |
| `ResultAsync.collect`     | `collectAsync`       |
| `ResultAsync.gen`         | `genAsync`           |
| `ResultAsync.retry`       | `retry`              |
| `ResultAsync.withTimeout` | `withTimeout`        |
| `ResultFn.from`           | `fromThrowable`      |
| `ResultAsyncFn.from`      | `fromAsyncThrowable` |

Each chain method has a standalone version that takes the result as its first
argument:

| Chain method    | Standalone      | Standalone async     |
| --------------- | --------------- | -------------------- |
| `map`           | `map`           | `mapAsync`           |
| `mapErr`        | `mapErr`        | `mapErrAsync`        |
| `andThen`       | `andThen`       | `andThenAsync`       |
| `orElse`        | `orElse`        | `orElseAsync`        |
| `tap`           | `tap`           | `tapAsync`           |
| `tapErr`        | `tapErr`        | `tapErrAsync`        |
| `match`         | `match`         | `matchAsync`         |
| `unwrapOr`      | `unwrapOr`      | `unwrapAsyncOr`      |
| `unwrapOrElse`  | `unwrapOrElse`  | `unwrapAsyncOrElse`  |
| `unwrapOrThrow` | `unwrapOrThrow` | `unwrapAsyncOrThrow` |

`Result.unwrapOr`, `Result.unwrapOrElse` and `Result.unwrapOrThrow`, and their
`ResultAsync` versions, are deprecated in favour of the chain methods.

## Documentation

Full API reference: [fransek.github.io/evercatch](https://fransek.github.io/evercatch/)

## License

MIT
