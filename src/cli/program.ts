import { Command } from 'commander';
import { registerCreateCommand } from '../commands/create.js';
import { registerPreviewCommand } from '../commands/preview.js';
import { registerValidateCommand } from '../commands/validate.js';

export function createProgram(): Command {
  const program = new Command();
  program.name('treegen').description('CSV・Markdown 表・tree から構成を生成する CLI').version('0.1.0');
  registerCreateCommand(program);
  registerPreviewCommand(program);
  registerValidateCommand(program);
  return program;
}

/** The same entry used by the executable and in-process CLI integration tests. */
export async function runCli(argv: string[]): Promise<number> {
  try {
    await createProgram().exitOverride().parseAsync(argv);
    return 0;
  } catch (error) {
    if (error instanceof Error && 'exitCode' in error) return Number(error.exitCode);
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
