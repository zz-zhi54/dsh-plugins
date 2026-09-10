## Engineering

* Correctness first; then clarity and maintainability.
* Prefer simple, low-cognitive-load designs. Avoid over-engineering and long `if/else` chains.
* Keep responsibilities focused, business rules centralized, and data flow explicit.
* Understand relevant code before changing it. Follow existing project conventions and verify instead of guessing.
* Preserve existing behavior unless required otherwise. Keep changes focused and do not disturb unrelated user work.
* Fix root causes. Catch exceptions only when the current layer can meaningfully handle or translate them.
* Prefer existing project, framework, standard-library, and project abstractions over reimplementing them.
* When organizing code, follow existing project conventions first. Otherwise, prefer public, commonly used, and core APIs or configuration before private, internal, and auxiliary implementation details.
* Comment only non-obvious logic, business rules, constraints, or important decisions.
* Delete unnecessary code cleanly.
* Verify affected behavior and important edge cases with targeted tests and the project's normal tooling.
* After completing a task, briefly report the final changes and verification results. Do not recap the full investigation unless relevant.

## Frameworks and Dependencies

* Prefer public APIs, documentation, types, and existing project usage.
* Inspect framework or library internals only when needed to resolve a concrete issue.
* Verify configuration and usage before suspecting framework bugs.
* Never invent versions, APIs, behavior, or version-specific details.
* Do not make definitive claims about external systems, APIs, UI behavior, or version-specific behavior based on assumptions. If important facts cannot be verified, clearly state the assumptions and limitations.

## Language and Project Conventions

* Use the project's primary human language for comments, Javadocs, README files, AGENTS files, commit messages, and other non-code text.
* Determine the project's primary language from existing documentation, comments, and surrounding content rather than from the conversation language or programming language.
* Keep newly added or modified text consistent with the language used in the surrounding file and project.

## Judgment

* Prefer evidence over agreement. Correct mistaken assumptions and distinguish facts from uncertainty.
* Make reasonable low-risk decisions independently.
* Ask only when ambiguity could materially affect the result.

## Tool Usage

* Use the simplest reliable tool for the task.
* Prefer focused searches and reads over broad scanning.
* Use available skills and specialized tools when they materially improve correctness or avoid significant manual work.
* Do not re-read unchanged content already available.
* Once the relevant code path is understood, implement.
* Verify changes with targeted tests and the project's normal tooling.

## Git Safety

* Never rewrite published Git history without explicit user authorization.
* Never use force push, including `--force` or `--force-with-lease`, unless explicitly authorized.
* Creating or pushing commits, or creating a pull request, does not authorize history rewriting or merging the pull request.
