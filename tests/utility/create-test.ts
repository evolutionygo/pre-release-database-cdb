import path from "node:path";
import { useYGOProTest, YGOProTestOptions } from "ygopro-jstest";

type MaybeArray<T> = T | T[];

const toArray = <T>(value: MaybeArray<T> | undefined): T[] => {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

export const createTest = (
  options: Partial<YGOProTestOptions> = {},
  cb: Parameters<typeof useYGOProTest>[1],
) =>
  useYGOProTest(
    {
      coverage: true,
      ...options,
      ygoproPath: [
        ...toArray(options.ygoproPath),
        process.cwd(),
        path.resolve(process.cwd(), "tests"),
        path.resolve(process.cwd(), process.env.YGOPRO_PATH || "ygopro"),
      ],
    },
    cb,
  );
