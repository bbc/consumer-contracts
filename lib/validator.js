async function validateContract(contract, cb) {
  return contract.validate(cb);
}

// todo:
//  - make sure below function has the same interface as previous
//  - delete runner tests and fixtures
//  - check still works with external library - bundles?
//  - documentation
//     - document the fact that it's an async interface and clients should possible await calls to the library, probably in release.
//     - document odd client configuration - lib/fetch-client.js
//  - pr to Nick

/**
 *
 * @param {*} contracts A set of Contracts to validate {@link Contract}
 * @returns
 */
export async function validateContracts(contracts, cb) {
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
