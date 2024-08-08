async function validateContract(contract, cb) {
  return contract.validate(cb);
}

/**
 * 
 * @param {*} contracts A set of Contracts to validate {@link Contract}
 * @returns 
 */
export async function validator(contracts, cb) {
  return await Promise.all(contracts.map(c => validateContract(c, cb)));

  // let result = [];

  // let chain = Promise.resolve();

  // contracts.forEach((contract) => {
  //   chain = chain
  //     .then(async () => await validateContract(contract))
  //     .then((validationResult) => {
  //       result.push(validationResult);
  //     });
  // });

  // return chain.then(() => result);
}
