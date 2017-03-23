'use strict';

/* eslint-disable no-console */

const colors = require('chalk');
const util = require('util');

function addErrIndicies(results) {
  let errIndex = 1;

  results.forEach((result) => {
    if (result.err) {
      result.errIndex = errIndex++;
    }
  });
}

function printResult(result) {
  const consumer = result.contract.consumer;
  const name = result.contract.name;

  if (result.err) {
    console.log(' ', colors.red(result.errIndex + ')', consumer, '–', name));
  } else {
    console.log(' ', colors.green('✓'), colors.reset(consumer, '–', name));
  }
}

function printFailure(failure, i) {
  const contract = failure.contract;
  const error = failure.err;

  console.log(' ', colors.reset(i + 1 + ')', contract.consumer, '–', contract.name));
  console.log('    ', colors.red(error.message));
  if (error.detail) {
    console.log('     ', colors.gray(error.detail));
  }
  console.log('');
}

module.exports.print = function (data) {
  const failures = data.failures;
  const results = data.results;

  addErrIndicies(results);

  console.log('\n');
  results.forEach(printResult);

  console.log('\n');
  console.log(colors.green(util.format('  %d passing', data.totalPassed)));

  if (failures.length > 0) {
    console.log(colors.red(util.format('  %d failing', data.totalFailed)));
    console.log('');
    failures.forEach(printFailure);
  }

  console.log('');
};
