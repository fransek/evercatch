import { err, ok } from "./lib/result";
import { safeAsync } from "./lib/utils-async";

class AuthError extends Error {
  readonly name = "AuthError";
}
class FetchError extends Error {
  readonly name = "FetchError";
}

const fetchUserData = async () => {
  const [authError, user] = await safeAsync(auth(false));
  if (authError) {
    return err(authError);
  }
  const [fetchError, response] = await safeAsync(
    fetch(`https://api.example.com/user/${user.id}`),
  );
  if (fetchError) {
    return err(fetchError);
  }
  if (!response.ok) {
    return err(
      new FetchError("Failed to fetch user data", { cause: response }),
    );
  }
  const data = await response.json();
  return ok(data);
};

const [error, data] = await fetchUserData();
if (error) {
  console.error(error);
} else {
  console.log(data);
}

async function auth(shouldThrow: boolean): Promise<{ id: string }> {
  if (shouldThrow) {
    throw new AuthError("User not authenticated");
  }
  return { id: "user-123" };
}
