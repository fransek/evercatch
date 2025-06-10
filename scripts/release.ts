import { execSync } from "child_process";

const version = process.argv[2];

const chain = (...commands: string[]) => {
  return commands.join(" && ");
};

execSync(
  chain(
    `git checkout -b release/v${version}`,
    `pnpm version ${version}`,
    `git push --set-upstream origin release/v${version}`,
    `gh pr create --title "Release v${version}" --body "Release v${version}" --label "release"`,
  ),
  { stdio: "inherit" },
);
