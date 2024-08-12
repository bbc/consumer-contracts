#! /usr/bin/env node

import { program } from "commander";
import { runner } from "./runner.js";

program
  .version(process.env.npm_package_version)
  .command("run [files...]")
  .description(
    "Run the contracts in the ./contracts directory (or just the files specified)",
  )
  .action(runner);

program.parse(process.argv);

if (!program.args.length) program.help();
