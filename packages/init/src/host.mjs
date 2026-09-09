import { createUserMessage } from '@deepseek-ai/dsh-llm'

export const name = 'command-init'
export const inject = ['commands']

const USAGE = '用法：/init（不接受参数）'

const INIT_PROMPT = `Initialize the current repository's AI development context.

First inspect and understand the repository. You may read any files needed for analysis, but the only file you may create or modify is the repository-root \`AGENTS.md\`. Do not modify any other file.

Create or update the repository-root \`AGENTS.md\`. If it already exists, preserve accurate and useful guidance, remove stale or redundant content, and add only important missing information.

Treat \`AGENTS.md\` as a concise operating guide for coding agents, not as repository documentation.

Include only repository-specific information that materially affects how an agent should work, such as:

* canonical build, run, test, lint, and format commands;
* non-obvious architectural boundaries or module relationships;
* project-specific conventions that are not readily inferable from the code;
* important constraints, generated-code boundaries, or files that should not be edited directly;
* unusual development workflows, tooling, or validation steps;
* non-obvious locations an agent must know to find or change something correctly.

Do not:

* describe the repository directory by directory;
* list files or modules merely because they exist;
* restate information that is obvious from the repository structure;
* duplicate README, build-file, or configuration-file content unless an agent specifically needs it to work correctly;
* record versions unless they materially affect development behavior;
* add generic software-engineering advice;
* document implementation details likely to become stale after routine refactoring.

Prefer stable guidance over exhaustive detail. Prefer pointing to the authoritative file or directory over copying information from it.

When deciding whether to include something, ask: if this item were omitted, would a future coding agent be materially more likely to make a mistake? If not, omit it.

Keep \`AGENTS.md\` as short as practical.

After editing, read the final file and verify that it is accurate, repository-specific, low-maintenance, and that no file other than the repository-root \`AGENTS.md\` was changed.
`

function executeInit(invocation) {
  if (invocation.rawInput.trim().length > 0) {
    return { kind: 'error', text: USAGE }
  }

  invocation.agent.followup(createUserMessage({
    content: [{ type: 'text', text: INIT_PROMPT }],
    source: { kind: 'user' },
  }))

  return {
    kind: 'success',
    text: '已向 Agent 发送仓库初始化请求。',
  }
}

export function apply(ctx) {
  ctx.effect(() => ctx.commands.register({
    name: 'init',
    description: '在 AGENTS.md 中初始化仓库上下文',
    input: { hint: '（不接受参数）' },
    handler: executeInit,
  }), 'command-init: command')
}
