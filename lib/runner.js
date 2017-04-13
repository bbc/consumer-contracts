'use strict';

/* eslint-disable no-console */

const _ = require('lodash');
const FileHound = require('filehound');
const path = require('path');
const fs = require('fs');
const formatter = require('./formatter');
const validateContracts = require('./validator');

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function loadContracts(file) {
  const contract = require(file);
  if (isEmpty(contract)) {
    throw new Error('No contract is defined.');
  }
  return contract;
}

function validateFiles(files) {
  let contracts;

  try {
    contracts = files.map(loadContracts);
  } catch (err) {
    err.message = 'Failed to load contract: ' + err.message;
    console.error(err.stack);
    return process.exit(1);
  }

  validateContracts(contracts, (err, results) => {
    const failures = _(results).filter('err').compact().value();
    const totalCompleted = contracts.length;
    const totalFailed = failures.length;
    const totalPassed = totalCompleted - totalFailed;
    const exitCode = (failures.length > 0) ? 1 : 0;

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
    files = files.map((file) => {
      return path.join(process.cwd(), file);
    });

    return validateFiles(files);
  }

  const dir = path.join(process.cwd(), 'contracts');
  if (!fs.existsSync(dir)) {
    console.error('No contracts directory found in the current working directory.');
    return process.exit(1);
  }

  FileHound.create()
    .paths(dir)
    .ext('js')
    .find((err, files) => {
      if (err) {
        console.error(err.message);
        return process.exit(1);
      }
      return validateFiles(files);
    });
};
