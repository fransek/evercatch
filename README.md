# Evercatch

[![Version](https://img.shields.io/npm/v/evercatch)](https://npmjs.com/package/evercatch)
[![Downloads](https://img.shields.io/npm/dm/evercatch.svg)](https://npmjs.com/package/evercatch)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/evercatch)](https://bundlephobia.com/package/evercatch)

No more uncaught errors!

```bash
npm install evercatch
# or
yarn add evercatch
# or
pnpm add evercatch
```

```typescript
import { auth } from "auth";
import { err, ok, safeAsync } from "evercatch";

const fetchUserData = async () => {
  const [authError, user] = await safeAsync(auth(), "AUTH_ERROR");
  if (authError) {
    return err(authError);
  }
  const response = await fetch(`https://api.example.com/user/${user.id}`);
  if (!response.ok) {
    return err("FETCH_ERROR", new Error("Failed to fetch user data"));
  }
  const data = await response.json();
  return ok(data);
};

const [error, data] = await fetchUserData();
if (error) {
  console.error(error.message);
} else {
  console.log(data);
}
```

[Documentation](https://fransek.github.io/evercatch/)
