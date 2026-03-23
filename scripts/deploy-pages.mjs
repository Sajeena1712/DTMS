import { execSync } from "node:child_process";
import ghPages from "gh-pages";

const repoUser = process.env.GH_PAGES_GIT_USER || "github-actions[bot]";
const repoEmail = process.env.GH_PAGES_GIT_EMAIL || "github-actions[bot]@users.noreply.github.com";

try {
  execSync(`git config user.name "${repoUser}"`, { stdio: "ignore" });
  execSync(`git config user.email "${repoEmail}"`, { stdio: "ignore" });
} catch {
  // If git config isn't available, gh-pages may still work when global identity exists.
}

ghPages.publish(
  "dist",
  {
    branch: "gh-pages",
    dotfiles: true,
  },
  (error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    console.log("Published dist to gh-pages.");
  },
);
