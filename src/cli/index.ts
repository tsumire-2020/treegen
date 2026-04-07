#!/usr/bin/env node

import { Command } from "commander";
import { registerCreateCommand } from "../commands/create.js";
import { registerPreviewCommand } from "../commands/preview.js";
import { registerValidateCommand } from "../commands/validate.js";

const program = new Command();

program
  .name("treegen")
  .description("Markdownのtreeコードブロックから構成を生成するCLI")
  .version("0.1.0");

registerCreateCommand(program);
registerPreviewCommand(program);
registerValidateCommand(program);

program.parse();
