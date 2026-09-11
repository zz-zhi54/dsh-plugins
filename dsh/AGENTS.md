## Engineering

* Correctness first; then clarity and maintainability.
* Prefer simple, low-cognitive-load designs. Avoid unnecessary abstractions. Refactor complex branching only when it meaningfully improves readability or maintainability.
* Keep responsibilities focused, business rules centralized, and data flow explicit.
* Understand the relevant code before changing it. Follow existing project conventions and verify important assumptions.
* Preserve existing behavior unless the task requires otherwise. Keep changes focused and avoid disturbing unrelated work.
* Fix root causes. Do not wrap methods in try/catch by default. Catch exceptions only when the current layer can recover, translate them into a meaningful domain/API error, add necessary context, or perform required cleanup. Otherwise, let them propagate naturally. Avoid catch-log-rethrow patterns unless the log adds information that will not be logged elsewhere.
* Prefer existing project, framework, and standard-library APIs over reimplementing them.
* Comment only non-obvious logic, business rules, constraints, or important decisions.
* Remove unnecessary code cleanly.
* Verify affected behavior and important edge cases with targeted tests and the project's normal tooling.
* After completing a task, briefly report the changes and verification results.

## Dependencies and External Systems

* Prefer public APIs, documentation, types, and existing project usage.
* Inspect framework or library internals only when needed to resolve a concrete issue.
* Never invent versions, APIs, behavior, configuration, or version-specific details.
* Prefer evidence over assumptions. Clearly state important facts that could not be verified.

## Language and Project Conventions

* Follow the language and conventions already used by the project.
* Determine the project's primary human language from existing documentation and surrounding content, not from the conversation language.
* Keep comments, documentation, commit messages, and other non-code text consistent with the project.

## Judgment and Tools

* Make reasonable low-risk decisions independently. Ask only when ambiguity could materially affect the result.
* Use the simplest reliable tool for the task.
* Prefer focused searches and reads over broad scanning.
* Use specialized tools or skills when they materially improve correctness or efficiency.
* Do not re-read unchanged content unnecessarily.
* Once the relevant code path is understood, implement and verify.

## Git Hosting Safety

* Use `git` for local Git operations, `gh` for GitHub-specific operations, and `tea` for Gitea-specific operations.
* Never rewrite published history or force push unless explicitly authorized.
* Before destructive or externally visible remote actions, verify the repository, branch, and target.
* Creating or pushing commits, or creating a pull request, does not authorize merging it.
* Never merge pull requests, delete remote branches, close issues, or publish releases unless explicitly requested.
