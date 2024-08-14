import { Contract } from "./contract";
import { ValidationResultWithContext } from "./formatter";

export async function validateContracts(contracts: Contract[], cb: (err: any, results: any) => void) {
  let schemaValidationResults: ValidationResultWithContext[] = [];
  await Promise.all(contracts.map(contract => contract.validate((err, result) => {
    schemaValidationResults.push({ err, ...result, contract, });
  })));
  cb(undefined, schemaValidationResults);
};
