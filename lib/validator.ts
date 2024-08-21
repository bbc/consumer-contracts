import { Contract } from "./contract";
import { ValidationResultWithContext } from "./formatter";

/**
 * Validates all of the contracts. 
 * @param contracts The collection of contracts to validate.
 * @param cb callback after validation. Currently err is unused and will always be undefined. Check individual ValidationResultWithContext for errors.
 */
export async function validateContracts(contracts: Contract[], cb: (err: any, results: ValidationResultWithContext[]) => void) {
  let schemaValidationResults: ValidationResultWithContext[] = [];

  for (const contract of contracts) {
    await new Promise<void>((resolve, reject) => {
      contract.validate((err, result) => {
        schemaValidationResults.push({ err, ...result, contract });
        resolve();
      });
    });
  }

  cb(undefined, schemaValidationResults);
};
