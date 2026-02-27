# Claude Project Notes

## UI Color Standard

Use a minimal-color visual system across the app:

- Keep default surfaces, borders, and text neutral.
- Use color primarily for status and severity:
  - success
  - warning
  - error
- Do not introduce decorative accent colors for normal content.
- Preserve strong contrast in all themes (light, medium-dark, dark).
- If a status color reduces readability in any theme, prefer neutral styling and retain the status via label/icon text.

## Practical Rule for New UI Work

When adding or changing components:

1. Start with neutral `theme-*` tokens.
2. Add color only if it conveys state.
3. Verify legibility in light mode first, then medium-dark and dark.
