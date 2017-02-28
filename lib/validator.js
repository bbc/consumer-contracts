var _ = require('lodash');
var async = require('async');
var formatter = require('./formatter');

function validateContract(contract, cb) {
  contract.validate(function (err) {
    cb(null, {
      contract: contract,
      err: err
    });
  });
}

module.exports = function (contracts) {
  async.mapSeries(contracts, validateContract, function (err, results) {
    var failures = _(results).filter('err').compact().value();
    var totalCompleted = contracts.length;
    var totalFailed = failures.length;
    var totalPassed = totalCompleted - totalFailed;
    var exitCode = (failures.length > 0) ? 1 : 0;

    formatter.print({
      results: results,
      failures: failures,
      totalCompleted: totalCompleted,
      totalFailed: totalFailed,
      totalPassed: totalPassed
    });

    process.exit(exitCode);
  });
};
