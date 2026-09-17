# Evercatch

[![Version](https://img.shields.io/npm/v/evercatch)](https://npmjs.com/package/evercatch)
[![Downloads](https://img.shields.io/npm/dm/evercatch.svg)](https://npmjs.com/package/evercatch)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/evercatch)](https://bundlephobia.com/package/evercatch)

No more try/catch blocks. Evercatch provides a simple API for handling errors in a functional way, using result tuples.

```bash
npm install evercatch
# or
yarn add evercatch
# or
pnpm add evercatch
```

```typescript
const [error, value] = ok(42);
const [error, value] = err(new Error("Something went wrong"));
```

## Basic usage

```typescript
function parseNumber(str: string): Result<number, Error> {
  const num = Number(str);
  if (Number.isNaN(num)) {
    return err(new Error(`"${str}" is not a number`));
  }
  return ok(num);
}

const [error, value] = parseNumber("42");
```

## Errors can't be nullish

`null` in the error slot means "this result is ok, there is no error", so an
error can never be `null`. `undefined` is rejected along with it, since it means
"no error was passed". Both are rejected at compile time, and fall back to a new
`Error` at runtime:

```typescript
err(new Error("Oops")); // [Error: Oops, null]
err(); // [Error, null]

err(null); // Type error: null means "no error"
err(undefined); // Type error: use err() instead

declare const maybeError: Error | null;
err(maybeError); // Type error: the error could be null
```

Any other error is passed through as is, falsy or not. Branching on a falsy
error is up to you:

```typescript
err("Oops"); // ["Oops", null]
err(404); // [404, null]
err(0); // [0, null] — beware: if (error) will not catch this
```

Values are passed through untouched too, so a falsy value is a perfectly good
success:

```typescript
ok(); // [null, undefined]
ok(0); // [null, 0]
ok(null); // [null, null]
```

An error caught in a `catch` block can be passed on as is, since `unknown` is
allowed. `any` is not — widen it to `unknown` instead.

The same constraint applies to the types, so a result can never carry a nullish
error type. Use the exported `NotNullish` constraint when writing your own
generic helpers:

```typescript
type Invalid = Result<number, Error | null>; // Type error: the error could be null

function logError<E extends NotNullish<E>>(result: Result<unknown, E>) {
  const [error] = result;
  if (error) {
    console.error(error);
  }
}
```

## Advanced usage

```typescript
import { writeFileSync } from "node:fs";
import { err, fromPromise, fromThrowable, ok } from "evercatch";
import { db } from "./db";

type AppError =
  | { code: "DB"; message: string }
  | { code: "FILE"; message: string };

const writeSnapshot = fromThrowable(
  (path: string, contents: string) => writeFileSync(path, contents, "utf8"),
  () => ({ code: "FILE", message: "Could not write the report to disk" }),
);

async function exportUserReport(userId: string) {
  const [dbError, user] = await fromPromise(
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    }),
    () => ({
      code: "DB",
      message: "Could not load the user from the database",
    }),
  );

  if (dbError) return err(dbError);
  if (!user)
    return err({ code: "DB", message: `User ${userId} was not found` });

  const reportPath = `./tmp/user-${userId}.json`;
  const report = JSON.stringify(user, null, 2);

  const [fileError] = writeSnapshot(reportPath, report);
  if (fileError) return err(fileError);

  return ok(reportPath);
}

const [error, filePath] = await exportUserReport("42");

if (error) {
  console.error(error.code, error.message);
} else {
  console.log(`User report written to ${filePath}`);
}
```

## Namespaces

Every function is also available on an object named after the type it works
with, so a single import covers the whole API. The members are the same
functions as the standalone exports, just under shorter names:

| Namespace       | Member                      | Standalone export    |
| --------------- | --------------------------- | -------------------- |
| `Result`        | `Result.ok`                 | `ok`                 |
| `Result`        | `Result.err`                | `err`                |
| `Result`        | `Result.from`               | `resultFrom`         |
| `Result`        | `Result.unwrapOrThrow`      | `unwrapOrThrow`      |
| `Result`        | `Result.unwrapOr`           | `unwrapOr`           |
| `Result`        | `Result.unwrapOrElse`       | `unwrapOrElse`       |
| `ResultFn`      | `ResultFn.from`             | `fromThrowable`      |
| `ResultAsync`   | `ResultAsync.from`          | `fromPromise`        |
| `ResultAsync`   | `ResultAsync.unwrapOrThrow` | `unwrapAsyncOrThrow` |
| `ResultAsync`   | `ResultAsync.unwrapOr`      | `unwrapAsyncOr`      |
| `ResultAsync`   | `ResultAsync.unwrapOrElse`  | `unwrapAsyncOrElse`  |
| `ResultAsyncFn` | `ResultAsyncFn.from`        | `fromAsyncThrowable` |

Each namespace shares its name with the type it groups, so the same import
works as a value and as a type:

```typescript
import { Result, ResultAsync } from "evercatch";

function parseNumber(str: string): Result<number, Error> {
  const num = Number(str);
  if (Number.isNaN(num)) {
    return Result.err(new Error(`"${str}" is not a number`));
  }
  return Result.ok(num);
}

const [error, data] = await ResultAsync.from(
  fetch("https://api.example.com/data").then((res) => res.json()),
);
```

Importing a namespace pulls in all of its members, so import the functions
directly when bundle size matters.

[Documentation](https://fransek.github.io/evercatch/)
