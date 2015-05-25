var recursive = require('recursive-readdir');
var path = require('path');
var async = require('async');
var _ = require('lodash');
var util = require('util');
var colors = require('chalk');
var fs = require('fs');

function validateContract(contract, cb) {
  contract.validate(function (err) {
    cb(null, {
      contract: contract,
      err: err
    });
  });
}

function validateFiles(files) {
  var contracts;

  try {
    contracts = files.map(require);
  } catch (err) {
    err.message = 'Failed to load contract: ' + err.message;
    console.error(err.stack);
    return process.exit(1);
  }

  async.mapSeries(contracts, validateContract, function (err, results) {
    var failures = _(results).filter('err').compact().value();
    var completed = contracts.length;
    var failed = failures.length;
    var passed = completed - failed;
    var errIndex = 1;

    console.log('\n');
    results.forEach(function (result) {
      var consumer = result.contract.consumer;
      var name = result.contract.name;

      if (result.err) {
        console.log(' ', colors.red(errIndex++ +')', consumer, '–', name));
      } else {
        console.log(' ', colors.green('✓'), colors.reset(consumer, '–', name));
      }
    });

    console.log('\n');
    console.log(colors.green(util.format('  %d passing', passed)));

    if (failures.length > 0) {
      console.log(colors.red(util.format('  %d failing', failed)));
      console.log('');
      failures.forEach(function (failure, i) {
        var contract = failure.contract;
        var error = failure.err;

        console.log(' ', colors.reset(i + 1 + ')', contract.consumer, '–', contract.name));
        console.log('    ', colors.red(error.message));
        if (error.detail) {
          console.log('     ', colors.gray(error.detail));
        }
        console.log('');
      });
    }

    console.log('');
    if (failures.length > 0) process.exit(1);
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

  recursive(dir, function (err, files) {
    if (err) {
      console.error(err.message);
      return process.exit(1);
    }

    files = files.filter(function (file) {
      return /\.js$/.test(file);
    });

    validateFiles(files);
  });
};