import path from "node:path";
import fs from "node:fs";
import { useYGOProTest, YGOProTestOptions } from "ygopro-jstest";

type MaybeArray<T> = T | T[];

const toArray = <T>(value: MaybeArray<T> | undefined): T[] => {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const localWasmBinaryPath = path.resolve(
  process.cwd(),
  "wasm-bin",
  "libocgcore.wasm",
);

const getLocalWasmBinary = () =>
  fs.existsSync(localWasmBinaryPath)
    ? fs.readFileSync(localWasmBinaryPath)
    : undefined;

export const createTest = (
  options: Partial<YGOProTestOptions> = {},
  cb: Parameters<typeof useYGOProTest>[1],
) => {
  const localWasmBinary = getLocalWasmBinary();

  return useYGOProTest(
    {
      coverage: true,
      ...options,
      ocgcoreOptions: {
        ...(localWasmBinary ? { wasmBinary: localWasmBinary } : {}),
        ...(options.ocgcoreOptions ?? {}),
      },
      ygoproPath: [
        ...toArray(options.ygoproPath),
        process.cwd(),
        path.resolve(process.cwd(), "tests"),
        path.resolve(process.cwd(), process.env.YGOPRO_PATH || "ygopro"),
      ],
    },
    cb,
  );
};
