#! /usr/bin/env node

import { program } from "commander";
import { runner } from "./runner.js";
const { version } = require('./../../package.json');

program
  .command("run [files...]")
  .description(
    "Run the contracts in the ./contracts directory (or just the files specified)",
  )
  .action(runner);

if (version) program.version(version);

program.parse(process.argv);

if (!program.args.length) program.help();
