import { Command } from 'commander';
export function addInputOptions(command: Command): Command {
  return command
    .option('--input-format <format>', 'auto / csv / markdown', 'auto')
    .option('--source <target>', 'tree:N / table:N（種類ごとに 1 始まり）')
    .option('--tree-style <style>', 'auto / indent / branches');
}
