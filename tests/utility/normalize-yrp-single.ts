import path from "path";
import { YGOProYrp } from "ygopro-yrp-encode";
import fs from "node:fs"

export const normalizeYrpSingle = async (yrpPath: string) => {
  const yrpFilename = path.basename(yrpPath);
  const yrp = new YGOProYrp().fromYrp(await fs.promises.readFile(yrpPath));
  if (
    yrp.isSingleMode &&
    !fs.existsSync(
      path.resolve(process.cwd(), "tests", "single", yrp.singleScript),
    )
  ) {
    // patch yrp filename here
    const patchedYrpFilename = `${path.basename(yrpPath, ".yrp")}.lua`;
    const patchedYrpPath = path.resolve(
      process.cwd(),
      "tests",
      "single",
      patchedYrpFilename,
    );
    if (fs.existsSync(patchedYrpPath)) {
      yrp.singleScript = patchedYrpFilename;
      const patchedYrpDir = path.resolve(process.cwd(), "tests", "yrp-patched");
      await fs.promises.mkdir(patchedYrpDir, { recursive: true });
      const newYrpPath = path.resolve(patchedYrpDir, yrpFilename);
      await fs.promises.writeFile(newYrpPath, yrp.toYrp());
    } else {
      throw new Error(
        `YRP ${yrpFilename} references singleScript ${yrp.singleScript} which does not exist, and no patched script found at ${patchedYrpPath}`,
      );
    }
  }
  return yrp;
};
