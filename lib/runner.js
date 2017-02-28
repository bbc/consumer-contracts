var FileHound = require('filehound');
var path = require('path');
var fs = require('fs');
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

  validateContracts(contracts);
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
