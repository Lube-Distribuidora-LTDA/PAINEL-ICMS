(function () {
  // Datasets injetados de fora (React chama icms3dEl.datasets = {...} com os
  // dados reais do período). Sem isso, fica vazio até serem passados.
  const EMPTY = { axis: '', cats: [], ent: [], sai: [] };

  const MONO = 'var(--font-jetbrains-mono),ui-monospace,Menlo,monospace';
  const fmt = n => 'R$ ' + (n >= 1e6 ? (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi'
    : n >= 1e4 ? (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil'
      : n >= 1e3 ? (n / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil'
        : n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }));

  const SKIN = {
    ent: { front: 'linear-gradient(180deg,#4a5cf2,#1b2596)', side: 'linear-gradient(180deg,#2b3ad6,#101867)', top: 'linear-gradient(160deg,#8f9dff,#4a5cf2)', glow: 'rgba(58,76,236,.55)', txt: '#aab6ff' },
    sai: { front: 'linear-gradient(180deg,#ff3341,#a3070f)', side: 'linear-gradient(180deg,#d0121d,#6d040a)', top: 'linear-gradient(160deg,#ff8a92,#ff3341)', glow: 'rgba(240,26,40,.5)', txt: '#ff9aa1' }
  };

  function el(tag, css, txt) {
    const d = document.createElement(tag);
    d.style.cssText = css;
    if (txt != null) d.textContent = txt;
    return d;
  }

  class Icms3D extends HTMLElement {
    constructor() {
      super();
      this._mode = 'aliq'; this._series = 'both';
      this._datasets = null;
      this.rx = 22; this.ry = -26; this.idle = true; this.labels = [];
    }
    static get observedAttributes() { return ['mode', 'series']; }
    attributeChangedCallback(n, o, v) { if (o !== v) this[n] = v; }
    set mode(v) { if (!v || v === this._mode) return; this._mode = v; if (this.world) this.build(); }
    get mode() { return this._mode; }
    set series(v) { if (!v || v === this._series) return; this._series = v; if (this.world) this.build(); }
    get series() { return this._series; }
    // datasets = { aliq: {axis,cats,ent,sai}, icms: {...}, uf: {...}, base: {...} }
    set datasets(v) { this._datasets = v; if (this.world) this.build(); }
    get datasets() { return this._datasets; }

    connectedCallback() {
      if (this.world) return;
      this.style.cssText = 'display:block;width:100%;height:100%;position:relative;overflow:hidden;cursor:grab;user-select:none;touch-action:none';

      this.stage = el('div', 'position:absolute;inset:0;perspective:1500px;perspective-origin:50% 40%');
      this.world = el('div', 'position:absolute;left:50%;top:70%;transform-style:preserve-3d;will-change:transform');
      this.stage.appendChild(this.world);
      this.appendChild(this.stage);
      this.overlay = el('div', 'position:absolute;inset:0;pointer-events:none');
      this.appendChild(this.overlay);

      let drag = null;
      const down = e => {
        drag = { x: e.clientX, y: e.clientY, rx: this.rx, ry: this.ry };
        this.idle = false; clearTimeout(this._t); this.style.cursor = 'grabbing';
      };
      const move = e => {
        if (!drag) return;
        this.ry = drag.ry + (e.clientX - drag.x) * 0.34;
        this.rx = Math.max(4, Math.min(62, drag.rx - (e.clientY - drag.y) * 0.26));
        this.apply();
      };
      const up = () => {
        if (!drag) return;
        drag = null; this.style.cursor = 'grab';
        this._t = setTimeout(() => { this.idle = true; this._base = this.ry; this._t0 = performance.now(); }, 5000);
      };
      this.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      this._cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };

      this._base = this.ry; this._t0 = performance.now();
      const loop = () => {
        this._raf = requestAnimationFrame(loop);
        if (this.idle) {
          this.ry = this._base + Math.sin((performance.now() - this._t0) / 4200) * 16;
          this.apply();
        }
      };
      loop();

      this.build();
      const ro = new ResizeObserver(() => this.build());
      ro.observe(this);
    }

    disconnectedCallback() { cancelAnimationFrame(this._raf); this._cleanup && this._cleanup(); }

    apply() {
      this.world.style.transform = `rotateX(${this.rx}deg) rotateY(${this.ry}deg)`;
      const W = this.clientWidth || 900, H = this.clientHeight || 480, d = 1500;
      const px = W * 0.5, py = H * 0.4, ox = W * 0.5 - px, oy = H * 0.70 - py;
      const rx = this.rx * Math.PI / 180, ry = this.ry * Math.PI / 180;
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      for (const l of this.labels) {
        const p = l._p;
        const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy, y1 = p.y;
        const y2 = y1 * cx - z1 * sx, z2 = y1 * sx + z1 * cx;
        const k = d / Math.max(d - z2, 120);
        const fs = l._s * Math.max(0.72, Math.min(1.22, k));
        l.style.fontSize = fs.toFixed(2) + 'px';
        l.style.opacity = Math.max(0.35, Math.min(1, k * 0.95));
        l._sx = px + (ox + x1) * k;
        l._sy = py + (oy + y2) * k;
      }
      this.stagger();
    }

    box(x, z, w, h, d, skin) {
      const b = el('div', `position:absolute;transform-style:preserve-3d;transform:translate3d(${x}px,${-h / 2}px,${z}px)`);
      const face = (css, tr) => b.appendChild(el('div', `position:absolute;left:0;top:0;${css};transform:${tr};backface-visibility:hidden`));
      const cw = `width:${w}px;height:${h}px;margin-left:${-w / 2}px;margin-top:${-h / 2}px`;
      const cs = `width:${d}px;height:${h}px;margin-left:${-d / 2}px;margin-top:${-h / 2}px`;
      const ct = `width:${w}px;height:${d}px;margin-left:${-w / 2}px;margin-top:${-d / 2}px`;
      face(cw + `;background:${skin.front};box-shadow:inset 0 1px 0 rgba(255,255,255,.35)`, `translateZ(${d / 2}px)`);
      face(cw + `;background:${skin.side};opacity:.85`, `rotateY(180deg) translateZ(${d / 2}px)`);
      face(cs + `;background:${skin.side}`, `rotateY(90deg) translateZ(${w / 2}px)`);
      face(cs + `;background:${skin.side};filter:brightness(.78)`, `rotateY(-90deg) translateZ(${w / 2}px)`);
      face(ct + `;background:${skin.top};box-shadow:0 0 26px ${skin.glow}`, `rotateX(90deg) translateZ(${h / 2}px)`);
      return b;
    }

    stagger() {
      const cols = new Map();
      for (const l of this.labels) {
        if (l._col == null) { l.style.left = l._sx + 'px'; l.style.top = l._sy + 'px'; continue; }
        if (!cols.has(l._col)) cols.set(l._col, []);
        cols.get(l._col).push(l);
      }
      for (const pair of cols.values()) {
        const top = Math.min(...pair.map(l => l._sy));
        for (const l of pair) {
          const y = pair.length > 1 && l._ent ? top - ((l._h0 || 14) + 4) : l._sy;
          l.style.left = l._sx + 'px';
          l.style.top = y + 'px';
        }
      }
    }

    label(x, y, z, text, color, size, weight, italic) {
      const l = el('div', `position:absolute;left:0;top:0;white-space:nowrap;font-family:${MONO};font-size:${size}px;font-weight:${weight};letter-spacing:.06em;color:${color};${italic ? 'font-style:italic;' : ''}transform:translate(-50%,-50%);text-shadow:0 2px 10px rgba(0,0,0,.75)`, text);
      l._p = { x: x, y: y, z: z }; l._s = size;
      this.labels.push(l);
      this.overlay.appendChild(l);
      return l;
    }

    build() {
      const W = this.clientWidth || 900, H = this.clientHeight || 480;
      this.world.innerHTML = ''; this.overlay.innerHTML = ''; this.labels = [];
      const all = this._datasets || {};
      const S = all[this._mode] || EMPTY;
      if (!S.cats || !S.cats.length) return;
      const both = this._series === 'both';
      const showE = both || this._series === 'ent';
      const showS = both || this._series === 'sai';
      const n = S.cats.length;
      let max = 1;
      S.cats.forEach((c, i) => {
        if (showE) max = Math.max(max, S.ent[i] || 0);
        if (showS) max = Math.max(max, S.sai[i] || 0);
      });
      const step = Math.min(n > 5 ? 108 : 190, (W - 180) / n);
      const bw = both ? Math.min(40, step * 0.36) : Math.min(64, step * 0.5);
      const bd = 54;
      const maxH = Math.max(140, Math.min(320, H * 0.56));
      const vfs = step < 80 ? 8.5 : step < 100 ? 9 : 10.5;

      const fw = n * step + 130, fd = 300;
      this.world.appendChild(el('div',
        `position:absolute;left:0;top:0;width:${fw}px;height:${fd}px;margin-left:${-fw / 2}px;margin-top:${-fd / 2}px;` +
        `transform:rotateX(90deg);background:` +
        `repeating-linear-gradient(90deg,rgba(130,150,255,.16) 0 1px,transparent 1px 44px),` +
        `repeating-linear-gradient(0deg,rgba(130,150,255,.16) 0 1px,transparent 1px 44px),` +
        `radial-gradient(60% 70% at 50% 50%,rgba(30,44,140,.55),rgba(5,8,24,.9));` +
        `box-shadow:0 0 90px rgba(20,32,120,.6) inset`));

      S.cats.forEach((cat, i) => {
        const x = (i - (n - 1) / 2) * step;
        const items = [];
        if (showE) items.push({ v: S.ent[i] || 0, sk: SKIN.ent, z: both ? -32 : 0 });
        if (showS) items.push({ v: S.sai[i] || 0, sk: SKIN.sai, z: both ? 32 : 0 });
        items.forEach(it => {
          const h = it.v > 0 ? Math.max(it.v / max * maxH, 14) : 2;
          this.world.appendChild(this.box(x, it.z, bw, h, bd, it.sk));
          if (it.v > 0) {
            const lb = this.label(x, -Math.max(h, maxH * 0.16) - 13, it.z, fmt(it.v), it.sk.txt, vfs, 700, false);
            lb._col = i; lb._ent = it.z < 0; lb._pair = both;
          }
        });
        const cl = this.label(x, 50, fd / 2 + 44, cat, '#cfd6f8', step < 100 ? 11 : 13, 800, true);
        cl._fixed = true;
        if (cat.length > 6) {
          cl.style.whiteSpace = 'normal';
          cl.style.width = Math.round(step * 0.86) + 'px';
          cl.style.lineHeight = '1.15';
          cl.textContent = cat.replace(/ /g, '\n');
          cl.style.whiteSpace = 'pre-line';
        }
      });

      for (const l of this.labels) { l._w0 = l.offsetWidth; l._h0 = l.offsetHeight; }
      this.apply();
    }
  }

  if (!customElements.get('icms-3d')) customElements.define('icms-3d', Icms3D);
  window.Icms3D = Icms3D;
})();
