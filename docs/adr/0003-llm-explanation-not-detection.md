# ADR-0003: LLM Explains, Never Decides

Status: Accepted

## Context

A language model makes alerts readable, but letting it decide health or
severity would make monitoring correctness depend on a nondeterministic,
billable third party.

## Decision

The LLM only writes the human-readable `message` for a newly created
incident. Detection, severity, deduplication, and resolution stay fully
deterministic. Severity is stored at first detection and the model cannot
change it.

## Consequences

- Monitoring stays correct when the provider is down, slow, or wrong.
- Alert quality depends on prompt design and output validation, reviewed
  like any other code (`prompts.ts`, versioned `PROMPT_VERSION`).
- Provider swaps are one new file plus one factory line.
