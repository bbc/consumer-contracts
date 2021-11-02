'use strict';

const async = require('async');

function validateContract(contract, cb) {
  contract.validate((err) => {
    cb(null, {
      contract,
      err
    });
  });
}

module.exports = (contracts, cb) => {
  async.mapSeries(contracts, validateContract, cb);
};
