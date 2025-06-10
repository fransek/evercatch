import { execSync } from "child_process";
import packageJson from "../package.json";

const getDistTag = () => {
  const preId = packageJson.version.match(/-(\w+)/)?.at(1);
  switch (preId) {
    case "alpha":
      return "alpha";
    case "beta":
      return "beta";
    case "rc":
      return "next";
    default:
      return "latest";
  }
};

execSync(
  `pnpm publish --provenance --access public --no-git-checks --tag ${getDistTag()}`,
  { stdio: "inherit" },
);
