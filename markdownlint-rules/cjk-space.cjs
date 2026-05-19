const cjkBeforeAscii = /([\p{Script=Han}])([A-Za-z0-9])/gu;
const asciiBeforeCjk = /([A-Za-z0-9])([\p{Script=Han}])/gu;

const codeFence = /^\s*(`{3,}|~{3,})/;
const scriptOrStyleOpen = /^\s*<(script|style)(?:\s|>)/i;
const scriptOrStyleClose = /<\/(script|style)>\s*$/i;

function scrubInlineSyntax(line) {
  return line
    .replace(/`[^`]*`/g, (match) => " ".repeat(match.length))
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (match, alt) => {
      const prefixLength = 2;
      return " ".repeat(prefixLength) +
        alt +
        " ".repeat(match.length - prefixLength - alt.length);
    })
    .replace(/\[([^\]]*)\]\([^)]+\)/g, (match, text) => {
      const prefixLength = 1;
      return " ".repeat(prefixLength) +
        text +
        " ".repeat(match.length - prefixLength - text.length);
    })
    .replace(/<https?:\/\/[^>\s]+>/gi, (match) => " ".repeat(match.length))
    .replace(/<[^>\n]+>/g, (match) => " ".repeat(match.length))
    .replace(/\{[^{}\n]*\}/g, (match) => " ".repeat(match.length));
}

function reportMatches(regex, line, lineNumber, detail, onError) {
  regex.lastIndex = 0;

  for (const match of line.matchAll(regex)) {
    onError({
      lineNumber,
      detail,
      context: line.trim(),
      range: [match.index + 1, match[0].length]
    });
  }
}

module.exports = {
  names: ["cjk-space"],
  description: "Require spaces between CJK characters and ASCII letters/numbers",
  tags: ["whitespace", "cjk"],
  parser: "none",
  function: (params, onError) => {
    let inFence = false;
    let inScriptOrStyle = false;

    params.lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (codeFence.test(line)) {
        inFence = !inFence;
        return;
      }

      if (inFence) {
        return;
      }

      if (inScriptOrStyle) {
        if (scriptOrStyleClose.test(line)) {
          inScriptOrStyle = false;
        }
        return;
      }

      if (scriptOrStyleOpen.test(line)) {
        inScriptOrStyle = !scriptOrStyleClose.test(line);
        return;
      }

      const scrubbed = scrubInlineSyntax(line);
      reportMatches(
        cjkBeforeAscii,
        scrubbed,
        lineNumber,
        "Expected a space between the CJK character and the ASCII letter/number.",
        onError
      );
      reportMatches(
        asciiBeforeCjk,
        scrubbed,
        lineNumber,
        "Expected a space between the ASCII letter/number and the CJK character.",
        onError
      );
    });
  }
};
