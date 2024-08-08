import { Contract } from "./contract.js";

async function validateContract(contract, cb) {
  return contract.validate();

}

export function validator(contracts) {
  let result = [];
  let chain = Promise.resolve();

  contracts.forEach((contract) => {
    chain = chain
      .then(async () => await validateContract(contract))
      .then((validationResult) => {
        result.push(validationResult);
      });
  });

  return chain.then(() => result);
}
