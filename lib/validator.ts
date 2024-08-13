import { Contract } from "./contract";

export async function validateContracts(contracts: Contract[], cb: (err: any, results: any) => void) {
  return await Promise.all(contracts.map(contract => contract.validate(cb)));
};
