// unslop-ui measure: paste into the browser console, or run with
// Playwright: `const r = await page.evaluate(fs.readFileSync('measure.js','utf8'))`.
// Returns counts used in the before/after proof table (review-checklist.md).
(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0;
  };
  const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const els = [...document.querySelectorAll('body *')].filter(visible);
  const sets = { fontSizes: new Set(), fontWeights: new Set(), fontFamilies: new Set(), textColors: new Set(), bgColors: new Set(), borderColors: new Set(), radii: new Set() };
  let shadows = 0, gradients = 0, trackedCaps = 0, arbitrary = 0;
  const arbitraryRe = /(^|\s)[a-z-]+-\[[^\]]*\d+(\.\d+)?px[^\]]*\]/;
  for (const el of els) {
    const s = getComputedStyle(el);
    if (hasText(el)) {
      sets.fontSizes.add(s.fontSize);
      sets.fontWeights.add(s.fontWeight);
      sets.fontFamilies.add(s.fontFamily.split(',')[0].trim());
      sets.textColors.add(s.color);
      const ls = parseFloat(s.letterSpacing) || 0;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      const letters = own.replace(/[^\p{L}]/gu, '');
      const caps = s.textTransform === 'uppercase' || (letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase());
      if (caps && ls / parseFloat(s.fontSize) >= 0.04) trackedCaps++;
    }
    if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') sets.bgColors.add(s.backgroundColor);
    if (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && !/rgba\(.*, 0\)$/.test(s.borderTopColor)) sets.borderColors.add(s.borderTopColor);
    if (s.borderTopLeftRadius !== '0px') sets.radii.add(s.borderTopLeftRadius);
    if (s.boxShadow !== 'none') shadows++;
    if (/gradient\(/.test(s.backgroundImage)) gradients++;
    const cls = typeof el.className === 'string' ? el.className : '';
    if (arbitraryRe.test(cls)) arbitrary++;
  }
  const text = document.body.innerText;
  const emoji = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  const words = (text.match(/\S+/g) || []).length;
  const primaryButtons = document.querySelectorAll('.btn-primary').length;
  const out = {
    viewport: `${innerWidth}x${innerHeight}`,
    distinctFontSizes: sets.fontSizes.size,
    distinctFontWeights: sets.fontWeights.size,
    distinctFontFamilies: sets.fontFamilies.size,
    distinctColors: new Set([...sets.textColors, ...sets.bgColors, ...sets.borderColors]).size,
    distinctTextColors: sets.textColors.size,
    distinctBgColors: sets.bgColors.size,
    distinctBorderColors: sets.borderColors.size,
    distinctRadii: sets.radii.size,
    boxShadows: shadows,
    gradients,
    emoji,
    trackedUppercaseLabels: trackedCaps,
    arbitraryPxClasses: arbitrary,
    primaryButtons,
    visibleWords: words,
    lists: {
      fontSizes: [...sets.fontSizes].sort((a, b) => parseFloat(a) - parseFloat(b)),
      fontWeights: [...sets.fontWeights].sort(),
      fontFamilies: [...sets.fontFamilies],
      radii: [...sets.radii],
    },
  };
  console.log(JSON.stringify(out, null, 2));
  return out;
})();
