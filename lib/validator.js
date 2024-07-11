export function validateContract(contract, cb) {
  contract.validate((err) => {
    cb(null, {
      contract,
      err,
    });
  });
}

export function validator(contracts) {
  let result = [];
  let chain = Promise.resolve();

  contracts.forEach((contract) => {
    chain = chain
      .then(() => validateContract(contract))
      .then((validationResult) => {
        result.push(validationResult);
      });
  });

  return chain.then(() => result);
}
