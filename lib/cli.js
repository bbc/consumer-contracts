#! /usr/bin/env node

'use strict';

const program = require('commander');
const pkg = require('../package');
const runner = require('./runner');

program
  .version(pkg.version)
  .command('run [files...]')
  .description('Run the contracts in the ./contracts directory (or just the files specified)')
  .action(runner);

program.parse(process.argv);

if (!program.args.length) program.help();
