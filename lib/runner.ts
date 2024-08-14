import FileHound from "filehound";
import fs from "fs";
import _ from "lodash";
import path from "path";

import { Contract } from "./contract.js";
import { print } from "./formatter.js";
import { logger } from "./logger.js";
import { validateContracts } from "./validator.js";

function isEmpty(obj: Object) {
  return Object.keys(obj).length === 0;
}

async function loadContract(filepath: string) {
  const contract = require(filepath);

  if (contract instanceof Contract) {
    if (isEmpty(contract)) {
      throw new Error(`No contract defined for '${filepath}'`);
    }
    return Promise.resolve(contract);
  }
  return contract;
}

async function validateFiles(filepaths: string[]) {
  let contracts: Contract[];

  try {
    contracts = await Promise.all(filepaths.map(loadContract));
    contracts = contracts.flat();
  } catch (err: unknown) {
    (err as Error).message = "Failed to load contract: " + (err as Error).message;
    logger.error((err as Error).stack);
    process.exit(1);
  }

  // [{ contract, err }, ...]
  await validateContracts(contracts, (err, results) => {
    const failures = _(results).filter('err').compact().value();
    const totalCompleted = contracts.length;
    const totalFailed = failures.length;
    const totalPassed = totalCompleted - totalFailed;
    const exitCode = (failures.length > 0) ? 1 : 0;

    results = results.map((r: any, i: number) => ({ ...r[0], contract: contracts[i] }));

    print({
      results,
      failures,
      totalCompleted,
      totalFailed,
      totalPassed
    });

    process.exit(exitCode);
  });
}

export async function runner(filepaths: string[]) {
  if (filepaths.length > 0) {
    filepaths = filepaths.map((file) => {
      return path.join(process.cwd(), file);
    });

    return await validateFiles(filepaths);
  }

  const dir = path.join(process.cwd(), "contracts");
  if (!fs.existsSync(dir)) {
    logger.error(
      "No contracts directory found in the current working directory.",
    );
    return process.exit(1);
  }

  FileHound.create()
    .paths(dir)
    .ext([".mjs", ".js"])
    .find((err, files) => {
      if (err) {
        logger.error(err.message);
        return process.exit(1);
      }

      console.log('files', files);

      return validateFiles(files);
    });
}
