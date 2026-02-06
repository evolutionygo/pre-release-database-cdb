import path from "node:path";
import { useYGOProTest, YGOProTestOptions } from "ygopro-jstest";

export const createTest = (
  options: Partial<YGOProTestOptions> = {},
  cb: Parameters<typeof useYGOProTest>[1],
) =>
  useYGOProTest(
    {
      ...options,
      ygoproPath: [
        ...(options.ygoproPath || []),
        process.cwd(),
        path.resolve(process.cwd(), "tests"),
        path.resolve(process.cwd(), process.env.YGOPRO_PATH || "ygopro"),
      ],
    },
    cb,
  );
