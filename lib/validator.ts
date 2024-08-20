import { Contract } from "./contract";
import { ValidationResultWithContext } from "./formatter";

// this helps to deal with asynchronous dns processing.
// see: https://stackoverflow.com/questions/24320578/node-js-get-request-etimedout-esockettimedout
process.env.UV_THREADPOOL_SIZE = '64';

/**
 * Validates all of the contracts. 
 * @param contracts The collection of contracts to validate.
 * @param cb callback after validation. Currently err is unused and will always be undefined. Check individual ValidationResultWithContext for errors.
 */
export async function validateContracts(contracts: Contract[], cb: (err: any, results: ValidationResultWithContext[]) => void) {
  let schemaValidationResults: ValidationResultWithContext[] = [];

  for (const contract of contracts) {
    await contract.validate((err, result) => {
      schemaValidationResults.push({ err, ...result, contract });
    });
  }

  cb(undefined, schemaValidationResults);
};
