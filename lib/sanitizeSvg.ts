const DISALLOWED_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "canvas",
]);

function isUnsafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("javascript:") || normalized.startsWith("data:text/html");
}

export function sanitizeSvg(svgString: string): string {
  if (!svgString.trim()) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const root = doc.documentElement;

  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return "";
  }

  const allElements = Array.from(root.querySelectorAll("*"));
  for (const element of allElements) {
    const tagName = element.tagName.toLowerCase();
    if (DISALLOWED_TAGS.has(tagName)) {
      element.remove();
      continue;
    }

    const attributeNames = element.getAttributeNames();
    for (const name of attributeNames) {
      const lowerName = name.toLowerCase();
      const value = element.getAttribute(name) ?? "";

      if (lowerName.startsWith("on")) {
        element.removeAttribute(name);
        continue;
      }

      if ((lowerName === "href" || lowerName === "xlink:href") && isUnsafeUrl(value)) {
        element.removeAttribute(name);
      }
    }
  }

  return new XMLSerializer().serializeToString(root);
}
