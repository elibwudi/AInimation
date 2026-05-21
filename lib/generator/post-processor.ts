export function postProcessInteractiveHtml(html: string): string {
  let processed = convertLatexDelimiters(html);

  if (!processed.toLowerCase().includes('katex')) {
    processed = injectKatex(processed);
  }

  return processed;
}

function convertLatexDelimiters(html: string): string {
  const scriptBlocks: string[] = [];

  let processed = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
    scriptBlocks.push(match);
    return `__SCRIPT_BLOCK_${scriptBlocks.length - 1}__`;
  });

  processed = processed.replace(/\$\$([^$]+)\$\$/g, '\\[$1\\]');
  processed = processed.replace(/\$([^$\n]+?)\$/g, '\\($1\\)');

  for (let i = 0; i < scriptBlocks.length; i++) {
    const placeholder = `__SCRIPT_BLOCK_${i}__`;
    const idx = processed.indexOf(placeholder);
    if (idx !== -1) {
      processed =
        processed.substring(0, idx) +
        scriptBlocks[i] +
        processed.substring(idx + placeholder.length);
    }
  }

  return processed;
}

function injectKatex(html: string): string {
  const katexInjection = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function() {
    const katexOptions = {
        delimiters: [
            {left: '\\\\[', right: '\\\\]', display: true},
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ],
        throwOnError: false,
        strict: false,
        trust: true
    };

    let renderTimeout;
    function safeRender() {
        if (renderTimeout) clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            renderMathInElement(document.body, katexOptions);
        }, 100);
    }

    renderMathInElement(document.body, katexOptions);

    const observer = new MutationObserver((mutations) => {
        let shouldRender = false;
        mutations.forEach((mutation) => {
            if (mutation.target &&
                mutation.target.className &&
                typeof mutation.target.className === 'string' &&
                mutation.target.className.includes('katex')) {
                return;
            }
            shouldRender = true;
        });

        if (shouldRender) {
            safeRender();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    setInterval(() => {
        const text = document.body.innerText;
        if (text.includes('\\\\(') || text.includes('$$')) {
            safeRender();
        }
    }, 2000);
});
</script>`;

  const headCloseIdx = html.indexOf('</head>');
  if (headCloseIdx !== -1) {
    return (
      html.substring(0, headCloseIdx) +
      katexInjection +
      '\n</head>' +
      html.substring(headCloseIdx + 7)
    );
  }

  const bodyCloseIdx = html.indexOf('</body>');
  if (bodyCloseIdx !== -1) {
    return (
      html.substring(0, bodyCloseIdx) +
      katexInjection +
      '\n</body>' +
      html.substring(bodyCloseIdx + 7)
    );
  }

  return html + katexInjection;
}
