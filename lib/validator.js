var async = require('async');

function validateContract(contract, cb) {
  contract.validate(function (err) {
    cb(null, {
      contract: contract,
      err: err
    });
  });
}

module.exports = function (contracts, cb) {
  async.mapSeries(contracts, validateContract, cb);
};
