#! /usr/bin/env node

var program = require('commander');
var package = require('../package');
var runner = require('./runner');

program
  .version(package.version)
  .command('run [files...]')
  .description('Run the contracts in the ./contracts directory (or just the files specified)')
  .action(runner);

program.parse(process.argv);

if (!program.args.length) program.help();