var _ = require('lodash');
var FileHound = require('filehound');
var path = require('path');
var fs = require('fs');
var formatter = require('./formatter');
var validateContracts = require('./validator');

function validateFiles(files) {
  var contracts;

  try {
    contracts = files.map(require);
  } catch (err) {
    err.message = 'Failed to load contract: ' + err.message;
    console.error(err.stack);
    return process.exit(1);
  }

  validateContracts(contracts, function (err, results) {
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
}

module.exports = function (files) {
  if (files.length > 0) {
    files = files.map(function (file) {
      return path.join(process.cwd(), file);
    });

    return validateFiles(files);
  }

  var dir = path.join(process.cwd(), 'contracts');

  try {
    fs.statSync(dir);
  } catch (err) {
    console.error('No contracts directory found in the current working directory.');
    return process.exit(1);
  }

  FileHound.create()
    .paths(dir)
    .ext('js')
    .find(function (err, files) {
      if (err) {
        console.error(err.message);
        return process.exit(1);
      }
      validateFiles(files);
  });
};
