import colors from "picocolors";

import { Contract, TransformedResponse } from "./contract.js";
import { logger } from "./logger.js";

function addErrIndicies(results: ValidationResultWithContext[]) {
  let errIndex = 1;

  results.forEach((result) => {
    if (result.err) {
      result.errIndex = errIndex++;
    }
  });
}

function printResult(result: ValidationResultWithContext) {
  const consumer = result.contract.consumer;
  const name = result.contract.name;

  if (result.err) {
    logger.log(` ${colors.red(`${result.errIndex}) ${consumer} – ${name}`)}`);
  } else {
    logger.log(` ${colors.green("✓")} ${colors.reset(`${consumer} – ${name}`)}`);
  }
}

function printFailure(failure: ValidationFailure, i: number) {
  const contract = failure.contract;
  const error = failure.err;

  logger.log(
    ` ${colors.reset(`${i + 1}) ${contract.consumer} – ${contract.name}`)}`,
  );
  logger.log(`    ${colors.red(error.message)}`);
  if (error.detail) {
    logger.log(`     ${colors.gray(error.detail)}`);
  }
  logger.log("");
}

export type ValidationResult = {
  value?: TransformedResponse;
}

export type ValidationResultWithContext = ValidationResult & {
  contract: Contract;
  err: any;
  errIndex?: number;
};

type ValidationFailure = {
  contract: Contract;
  err: any;
};

type ValidationContext = {
  results: ValidationResultWithContext[];
  failures: ValidationFailure[];
  totalCompleted: number;
  totalFailed: number;
  totalPassed: number;
}

export function print(data: ValidationContext) {
  const failures = data.failures;
  const results = data.results;

  addErrIndicies(results);

  logger.log("\n");
  results.forEach(printResult);

  logger.log("\n");
  logger.log(colors.green(`  ${data.totalPassed} passing`));

  if (failures.length > 0) {
    logger.log(colors.red(`  ${data.totalFailed} failing`));
    logger.log("");
    failures.forEach(printFailure);
  }

  logger.log("");
}
