import { resolve } from "path";
import { prepareGitRepo, run } from "./utility/git-prepare";

const repoUrl = "https://code.moenext.com/nanahira/ygopro";
const repoDir = resolve(process.cwd(), "ygopro");

function prepareRootRepo() {
  prepareGitRepo({
    dir: repoDir,
    url: repoUrl,
  });
}

function prepareSubmodules() {
  run("git", ["submodule", "sync", "--recursive"], repoDir);
  run("git", ["submodule", "update", "--init", "--recursive"], repoDir);
  run(
    "git",
    [
      "submodule",
      "foreach",
      "--recursive",
      [
        "git fetch --prune origin +refs/heads/master:refs/remotes/origin/master",
        "git checkout -B master origin/master",
        "git reset --hard origin/master",
        "git submodule sync --recursive",
        "git submodule update --init --recursive",
      ].join(" && "),
    ],
    repoDir,
  );
  run(
    "git",
    [
      "submodule",
      "foreach",
      "--recursive",
      [
        "git fetch --prune origin +refs/heads/master:refs/remotes/origin/master",
        "git checkout -B master origin/master",
        "git reset --hard origin/master",
      ].join(" && "),
    ],
    repoDir,
  );
}

prepareRootRepo();
prepareSubmodules();
