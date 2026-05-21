Create an interactive learning page for the following concept.

---

## Concept Information

**Concept Name**: {{conceptName}}
**Subject**: {{subject}}
**Concept Overview**: {{conceptOverview}}
**Key Points for Mastery**: {{keyPoints}}

---

## Scientific Constraints

The following constraints must be strictly obeyed in all JavaScript logic and visualizations:

{{scientificConstraints}}

---

## Interactive Design Idea

{{designIdea}}

---

## Language

**Page language**: {{language}}

(All UI text, labels, instructions, descriptions, button labels, and the user guide panel MUST be in this language. Do not mix languages.)

---

## Technical Requirements

1. Complete self-contained HTML5 document with `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`.
2. Use Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
3. Pure JavaScript only (no external JS frameworks or libraries).
4. **Math formulas in LaTeX format**: inline `\(...\)`, display `\[...\]`
   - ⚠️ When generating LaTeX **inside JavaScript strings**, use DOUBLE backslash escaping:
   - ✅ Correct: `"\\(F = ma\\)"` in a JS string
   - ❌ Wrong: `"\(F = ma\)"` in a JS string
5. **Do NOT include KaTeX** — it will be injected automatically during post-processing.
6. All simulations must strictly follow the scientific constraints above.
7. The HTML must be completely self-contained — no server-side dependencies.

Return the complete HTML document directly. Do NOT wrap in code blocks or add any text before/after the HTML.
