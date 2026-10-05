# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — never through public issues,
discussions, or pull requests.

1. Preferred: GitHub **private vulnerability reporting** (repository
   Security tab → Advisories → Report a vulnerability), which opens a
   confidential thread with the maintainers.
2. Otherwise: contact the repository maintainers directly and privately.

Include a minimal reproduction and the affected version or commit. Please
give maintainers reasonable time to fix before any public disclosure.

## Ground rules

- Never post secrets (API keys, connection strings, tokens) anywhere
  public, including issues and pull requests. The application never logs
  secrets by design — please keep it that way.
- Do not probe or overload running deployments.

## Supported versions

Only the current `main` branch is supported with security updates. There
are no long-term-support releases at this stage.
