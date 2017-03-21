const async = require('async');

function validateContract(contract, cb) {
  contract.validate((err) => {
    cb(null, {
      contract: contract,
      err: err
    });
  });
}

module.exports = (contracts, cb) => {
  async.mapSeries(contracts, validateContract, cb);
};
