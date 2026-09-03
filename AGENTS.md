# File read restrictions

Do NOT read .npmrc; it has sensitive information that is excluded from git

# Library Development

This is a library intended to be used in other projects. All major decisions MUST
be confirmed by a human. Any changes to the core data model MUST be confirmed by
a human.

# Build agent guidelines

- For anything more complex than a quick change, use a todo list to track your work.
- When refactoring, verify that it works with one case before copying throughout.
- Prefer a TDD approach:
  1. Write a test that fails or update an existing test so that it fails.
  2. Prove it fails by running the test.
  3. Fix the code.
  4. Prove it is fixed by running the test.
- NEVER use `git add`, `git checkout`, `git restore`, etc. The management of the
  repository is left to humans.

# Memory

Major architectural decisions, best practices, and other things worth remembering
long-term are stored in docs/memory.md. All entries must be actionable, not merely
a historical record of churn.

# Changelog

`changelog.md` contains information useful for Component consumers, particularly
for updating versions of the library. This is NOT a graveyard for maintainer code
churn entries. No internal/maintainer-relevant information should be preserved here.
The format should be easy to scan and read for consumers of this library.

# Discovery of Development Practices

If you encounter a substantial issue that bogged down development, in particular
something that is likely to cause problems in the future, and you discovered a
solution, create an entry in docs/memory.md concisely explaining the problem and
solution for future development efforts, and alert your human that you did.
