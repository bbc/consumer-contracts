import * as FileHound from "filehound";
import fs from "fs";
import _ from "lodash";
import path from "path";

import { Contract } from "./contract.js";
import { print } from "./formatter.js";
import { logger } from "./logger.js";
import { validator } from "./validator.js";

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

async function loadContract(file) {
  const { contract } = await import(file);
  return contract;
}

async function loadContracts(file) {
  const contract = await loadContract(file);

  if (contract instanceof Contract) {
    if (isEmpty(contract)) {
      throw new Error(`No contract defined for '${file}'`);
    }
    return Promise.resolve(contract);
  }
  return contract;
}

async function validateFiles(files) {
  let contracts;

  try {
    contracts = await Promise.all(files.map(loadContracts));
    contracts = contracts.flat();
  } catch (err) {
    err.message = "Failed to load contract: " + err.message;
    logger.error(err.stack);
    return process.exit(1);
  }

  // [{ contract, err }, ...]
  await validator(contracts, (err, results) => {
    const failures = _(results).filter('err').compact().value();
    const totalCompleted = contracts.length;
    const totalFailed = failures.length;
    const totalPassed = totalCompleted - totalFailed;
    const exitCode = (failures.length > 0) ? 1 : 0;

    results = results.map((r, i) => ({ ...r[0], contract: contracts[i] }));

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

export async function runner(files) {
  if (files.length > 0) {
    files = files.map((file) => {
      return path.join(process.cwd(), file);
    });

    return await validateFiles(files);
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
    .ext("js")
    .find((err, files) => {
      if (err) {
        logger.error(err.message);
        return process.exit(1);
      }
      return validateFiles(files);
    });
}
