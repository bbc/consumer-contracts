#! /usr/bin/env node

const program = require('commander');
const package = require('../package');
const runner = require('./runner');

program
  .version(package.version)
  .command('run [files...]')
  .description('Run the contracts in the ./contracts directory (or just the files specified)')
  .action(runner);

program.parse(process.argv);

if (!program.args.length) program.help();
