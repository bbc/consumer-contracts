import { Contract } from "./contract";

export async function validateContracts(contracts: Contract[], cb: (err: any, results: any) => void) {
  return await Promise.all(contracts.map(contract => contract.validate((err, results) => {
    console.log('err, results', err, results)
    cb(err, results);
  })));
};
