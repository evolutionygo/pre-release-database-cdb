const { existsSync } = require('node:fs');
const { join } = require('node:path');

const loader = join(__dirname, 'wasm-bin', 'libocgcore.cjs');

const config = {
  "moduleFileExtensions": [
    "js",
    "json",
    "ts"
  ],
  "rootDir": "tests",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": [
    "**/*.(t|j)s"
  ],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "testTimeout": 60000
};

if (existsSync(loader)) {
  config.moduleNameMapper = {
    'vendor/wasm_cjs/libocgcore\\.cjs$': loader,
  };
}

module.exports = config;
