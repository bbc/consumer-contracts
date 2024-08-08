import _ from "lodash";
import * as FileHound from "filehound";
import path from "path";
import fs from "fs";

import { print as formatter } from "./formatter.js";
import { validator as validate } from "./validator.js";
import { Contract } from "./contract.js";
import { logger } from "./logger.js";

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

async function loadContract(file) {
  const contract = await import(file);
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

  validate(contracts, (err, results) => {
    const failures = _(results).filter("err").compact().value();
    const totalCompleted = contracts.length;
    const totalFailed = failures.length;
    const totalPassed = totalCompleted - totalFailed;
    const exitCode = failures.length > 0 ? 1 : 0;

    formatter.print({
      results,
      failures,
      totalCompleted,
      totalFailed,
      totalPassed,
    });

    process.exit(exitCode);
  });
}

export function runner(files) {
  if (files.length > 0) {
    files = files.map((file) => {
      return path.join(process.cwd(), file);
    });

    return validateFiles(files);
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
