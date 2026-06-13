import { mkdirSync } from "fs";
import { resolve } from "path";
import { prepareGitRepo } from "./utility/git-prepare";

const refDir = resolve(process.cwd(), "ref");
const repos = [
  {
    name: "ygopro-msg-encode",
    url: "https://github.com/purerosefallen/ygopro-msg-encode.git",
  },
  {
    name: "ygopro-cdb-encode",
    url: "https://github.com/purerosefallen/ygopro-cdb-encode.git",
  },
  {
    name: "koishipro-core.js",
    url: "https://github.com/purerosefallen/koishipro-core.js.git",
  },
  {
    name: "ygopro-jstest",
    url: "https://github.com/purerosefallen/ygopro-jstest.git",
  },
];

mkdirSync(refDir, { recursive: true });

for (const repo of repos) {
  prepareGitRepo({
    dir: resolve(refDir, repo.name),
    url: repo.url,
    branch: "main",
  });
}
