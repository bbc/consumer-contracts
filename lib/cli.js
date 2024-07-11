#! /usr/bin/env node

import program from "commander";

import pkg from "../package.json" with { type: "json" };
import { runner } from "./runner.js";

program
  .version(pkg.version)
  .command("run [files...]")
  .description(
    "Run the contracts in the ./contracts directory (or just the files specified)",
  )
  .action(runner);

program.parse(process.argv);

if (!program.args.length) program.help();
