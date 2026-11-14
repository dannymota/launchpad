// unslop-ui redline overlay. Paste into the browser console, or run with
// Playwright: await page.addScriptTag({ path: 'redline.js' }); then
// await page.evaluate(notes => window.unslopRedline(notes), notes);
// Each note: { sel: CSS selector, label: "from -> to", fixed: true|false, pass: "Spacing" }.
// fixed:false draws red (wrong value, before shot); fixed:true draws green (after shot).
// Screenshot after it runs. Remove with window.unslopRedline.clear().
(() => {
  const ID = 'unslop-redline-layer';
  function clear() {
    const old = document.getElementById(ID);
    if (old) old.remove();
  }
  function draw(notes) {
    clear();
    const layer = document.createElement('div');
    layer.id = ID;
    Object.assign(layer.style, {
      position: 'absolute', left: '0', top: '0', width: '0', height: '0',
      zIndex: '2147483647', pointerEvents: 'none',
      font: '500 11px/14px ui-monospace, SFMono-Regular, Menlo, monospace',
    });
    const missing = [];
    for (const n of notes) {
      const els = document.querySelectorAll(n.sel);
      if (!els.length) { missing.push(n.sel); continue; }
      const color = n.fixed ? '#16a34a' : '#dc2626';
      els.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const box = document.createElement('div');
        Object.assign(box.style, {
          position: 'absolute',
          left: r.left + scrollX + 'px', top: r.top + scrollY + 'px',
          width: r.width + 'px', height: r.height + 'px',
          outline: '1px solid ' + color, background: color + '14',
        });
        layer.appendChild(box);
        if (i === 0) {
          const tag = document.createElement('div');
          tag.textContent = (n.pass ? n.pass.toUpperCase() + '  ' : '') + n.label;
          Object.assign(tag.style, {
            position: 'absolute',
            left: r.left + scrollX + 'px',
            top: Math.max(0, r.top + scrollY - 18) + 'px',
            padding: '2px 6px', background: color, color: '#fff',
            borderRadius: '4px', whiteSpace: 'nowrap',
          });
          layer.appendChild(tag);
        }
      });
    }
    document.body.appendChild(layer);
    return { drawn: notes.length - missing.length, missing };
  }
  window.unslopRedline = draw;
  window.unslopRedline.clear = clear;
})();
