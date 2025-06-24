import { err, ok, ResultAsyncFn, safeAsync } from ".";

const fetchUserData = (async () => {
  const [authError, user] = await safeAsync(auth(), "AUTH_ERROR");
  if (authError) {
    return err(authError);
  }
  const response = await fetch(`https://api.example.com/user/${user.id}`);
  if (!response.ok) {
    return err("FETCH_ERROR", "Failed to fetch user data");
  }
  const data = await response.json();
  return ok(data);
}) satisfies ResultAsyncFn;

const [error, data] = await fetchUserData();
if (error) {
  console.error(error.message);
} else {
  console.log(data);
}

function auth(): Promise<{ id: string }> {
  throw new Error("Function not implemented.");
}
