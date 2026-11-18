"use client";

import { useEffect, useState } from "react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

function normHex(value) {
  const match = String(value).trim().match(HEX);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = hex.split("").map((char) => char + char).join("");
  return "#" + hex.toUpperCase();
}

function hexToRgb(hex) {
  const number = parseInt(hex.slice(1), 16);
  return [number >> 16 & 255, number >> 8 & 255, number & 255];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), difference = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (difference) {
    s = difference / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / difference) % 6 : max === g ? (b - r) / difference + 2 : (r - g) / difference + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

const hexToHsl = (hex) => rgbToHsl(...hexToRgb(hex));
const hslString = (hex) => { const [h, s, l] = hexToHsl(hex); return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`; };
const rgbString = (hex) => `rgb(${hexToRgb(hex).join(", ")})`;

function luminance(hex) {
  return hexToRgb(hex).map((value) => {
    value /= 255;
    return value <= .03928 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
}

function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

const MODES = {
  random: "Random", mono: "Monochromatic", analogous: "Analogous", complementary: "Complementary",
  split: "Split complementary", triadic: "Triadic", tetradic: "Tetradic", pastel: "Pastel",
  vibrant: "Vibrant", earthy: "Earthy", neutral: "Neutral",
};
const OFFSETS = { analogous: [0, 30, -30, 60, -60], complementary: [0, 180], split: [0, 150, 210], triadic: [0, 120, 240], tetradic: [0, 90, 180, 270] };
const random = (min, max) => min + Math.random() * (max - min);

function generateColor(mode, index, count, h0, base) {
  let h, s, l;
  if (mode === "mono") {
    h = h0; s = base ? base[1] : random(40, 80); l = 15 + 70 * (index + .5) / count;
  } else if (mode === "pastel") { h = random(0, 360); s = random(55, 85); l = random(78, 90); }
  else if (mode === "vibrant") { h = random(0, 360); s = random(80, 100); l = random(45, 58); }
  else if (mode === "earthy") { h = random(15, 50); s = random(25, 55); l = random(25, 60); }
  else if (mode === "neutral") { h = random(20, 50); s = random(3, 14); l = random(10, 92); }
  else if (mode === "random") { h = random(0, 360); s = random(35, 90); l = random(25, 80); }
  else { h = h0 + OFFSETS[mode][index % OFFSETS[mode].length]; s = (base ? base[1] : 70) + random(-15, 10); l = (base ? base[2] : 55) + random(-22, 22); }
  return hslToHex(h, s, l);
}

function gradientCss(g) {
  const stops = [...g.stops].sort((a, b) => a.p - b.p).map((stop) => `${stop.c} ${stop.p}%`).join(", ");
  if (g.type === "radial") return `radial-gradient(${g.shape} at 50% 50%, ${stops})`;
  if (g.type === "conic") return `conic-gradient(from ${g.angle}deg at 50% 50%, ${stops})`;
  return `linear-gradient(${g.angle}deg, ${stops})`;
}

const PRESETS = [
  ["Aurora", "Aurora", 160, "#00C9FF", "#92FE9D"],
  ["Sunset", "Sunset", 135, "#FF512F", "#DD2476"],
  ["Ocean", "Ocean", 180, "#2193B0", "#6DD5ED"],
  ["Neon Pulse", "Cyberpunk", 90, "#F953C6", "#B91D73", "#00F5D4"],
  ["Peach", "Pastel", 135, "#FFE5D9", "#FFCAD4", "#F4ACB7"],
  ["Midnight", "Dark", 160, "#0F2027", "#203A43", "#2C5364"],
  ["Gold Leaf", "Luxury", 120, "#BF953F", "#FCF6BA", "#B38728"],
  ["Forest", "Nature", 145, "#134E5E", "#71B280"],
  ["Candy", "Abstract", 45, "#FDBB2D", "#22C1C3", "#8B5CF6"],
  ["Violet Haze", "Popular", 135, "#8B5CF6", "#06B6D4"],
].map(([name, cat, angle, ...colors]) => ({
  name, cat,
  g: { type: "linear", angle, shape: "circle", stops: colors.map((c, i) => ({ c, p: Math.round(i * 100 / (colors.length - 1)) })) },
}));

const INITIAL_STATE = {
  tab: "palette", mode: "random", base: "#8B5CF6", useBase: false,
  pal: ["#8B5CF6", "#06B6D4", "#EC4899", "#F59E0B", "#10B981"].map((h) => ({ h, lock: false })),
  g: { type: "linear", angle: 135, shape: "circle", stops: [{ c: "#8B5CF6", p: 0 }, { c: "#06B6D4", p: 50 }, { c: "#EC4899", p: 100 }] },
  fg: "#FFFFFF", bg: "#8B5CF6", libTab: "presets",
};

export default function Page() {
  const [state, setState] = useState(INITIAL_STATE);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [ready, setReady] = useState(false);
  const [toastText, setToastText] = useState("");
  const [exportType, setExportType] = useState("CSS variables");
  const [gradientMode, setGradientMode] = useState("bg");
  const [previewDark, setPreviewDark] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [favoriteType, setFavoriteType] = useState("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cc_state");
      const fav = localStorage.getItem("cc_fav");
      const hist = localStorage.getItem("cc_hist");
      if (saved) setState({ ...INITIAL_STATE, ...JSON.parse(saved) });
      if (fav) setFavorites(JSON.parse(fav));
      if (hist) setHistory(JSON.parse(hist));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("cc_state", JSON.stringify(state));
  }, [state, ready]);
  useEffect(() => { if (ready) localStorage.setItem("cc_fav", JSON.stringify(favorites)); }, [favorites, ready]);
  useEffect(() => { if (ready) localStorage.setItem("cc_hist", JSON.stringify(history)); }, [history, ready]);

  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      if (event.code === "Space" && state.tab === "palette" && !target.closest("input,textarea,select,button,[contenteditable]")) {
        event.preventDefault();
        generate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toast(message) {
    setToastText(message);
    window.clearTimeout(window.__ccToast);
    window.__ccToast = window.setTimeout(() => setToastText(""), 1800);
  }

  async function copy(text, message = "Copied") {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const area = document.createElement("textarea");
      area.value = text; document.body.appendChild(area); area.select();
      document.execCommand("copy"); area.remove();
    }
    toast(message);
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a"); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast("Downloaded " + name);
  }

  function generate() {
    setState((current) => {
      const base = current.useBase ? hexToHsl(current.base) : null;
      const h0 = base ? base[0] : random(0, 360);
      const palette = current.pal.map((color, index) => color.lock ? color : { h: generateColor(current.mode, index, current.pal.length, h0, base), lock: false });
      setHistory((items) => [{ kind: "palette", data: palette.map((item) => item.h), label: MODES[current.mode], t: Date.now() }, ...items].slice(0, 20));
      return { ...current, pal: palette };
    });
    toast("Palette generated");
  }

  function addFavorite(kind, data, label) {
    const key = JSON.stringify(data);
    if (favorites.some((item) => item.kind === kind && JSON.stringify(item.data) === key)) { toast("Already in favorites"); return; }
    setFavorites((items) => [{ kind, data, label }, ...items]); toast("Saved to favorites");
  }

  function setTab(tab) { setState((current) => ({ ...current, tab })); }
  function updateState(patch) { setState((current) => ({ ...current, ...patch })); }
  const paletteHex = state.pal.map((item) => item.h);
  function randomizeGradient(g) {
    const h = random(0, 360);
    const stops = g.stops.map((_, index) => ({
      c: hslToHex(h + index * random(25, 70), random(60, 90), random(40, 65)),
      p: Math.round(index * 100 / (g.stops.length - 1)),
    }));
    const next = { ...g, stops, angle: Math.round(random(0, 360)) };
    updateState({ g: next });
    setHistory((items) => [{ kind: "gradient", data: next, label: "Random gradient", t: Date.now() }, ...items].slice(0, 20));
  }
  function exportGradientPng(g) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 630;
    const context = canvas.getContext("2d");
    const cx = 600, cy = 315;
    let brush;
    if (g.type === "radial") brush = context.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
    else if (g.type === "conic" && context.createConicGradient) brush = context.createConicGradient((g.angle - 90) * Math.PI / 180, cx, cy);
    else {
      const angle = g.angle * Math.PI / 180;
      const length = Math.abs(1200 * Math.sin(angle)) + Math.abs(630 * Math.cos(angle));
      const dx = Math.sin(angle) * length / 2, dy = -Math.cos(angle) * length / 2;
      brush = context.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    }
    if (!brush) { toast("Conic export is not supported by this browser"); return; }
    g.stops.forEach((stop) => brush.addColorStop(clamp(stop.p, 0, 100) / 100, stop.c));
    context.fillStyle = brush; context.fillRect(0, 0, 1200, 630);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "gradient.png"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      toast("PNG exported");
    });
  }

  function paletteExports() {
    const names = paletteHex.map((_, i) => ["primary", "secondary", "accent", "highlight", "surface", "muted", "extra"][i] || `color-${i + 1}`);
    return {
      "CSS variables": ":root {\n" + paletteHex.map((hex, i) => `  --color-${names[i]}: ${hex};`).join("\n") + "\n}",
      SCSS: paletteHex.map((hex, i) => `$color-${names[i]}: ${hex};`).join("\n"),
      JSON: JSON.stringify(Object.fromEntries(paletteHex.map((hex, i) => [names[i], hex])), null, 2),
      Tailwind: "module.exports = {\n  theme: {\n    extend: {\n      colors: {\n" + paletteHex.map((hex, i) => `        '${names[i]}': '${hex}',`).join("\n") + "\n      }\n    }\n  }\n}",
    };
  }

  const TABS = [["palette", "Palette"], ["gradient", "Gradient"], ["harmony", "Harmony"], ["contrast", "Contrast"], ["playground", "Preview"], ["library", "Library"]];

  function PaletteView() {
    const exports = paletteExports();
    return (
      <>
        <h1>Palette generator</h1><p className="sub">Press Space to generate. Locked colors stay put.</p>
        <div className="bar">
          <select value={state.mode} onChange={(event) => updateState({ mode: event.target.value })} aria-label="Generation mode">
            {Object.entries(MODES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <label className="row" style={{ margin: 0 }}><input type="checkbox" checked={state.useBase} onChange={(event) => updateState({ useBase: event.target.checked })} /> From base</label>
          <input type="color" value={state.base.toLowerCase()} onChange={(event) => updateState({ base: normHex(event.target.value) || state.base })} aria-label="Base color" />
          <button className="btn pri" onClick={generate}>Generate</button>
          <button className="btn" onClick={() => state.pal.length < 10 && updateState({ pal: [...state.pal, { h: generateColor(state.mode, state.pal.length, state.pal.length + 1, random(0, 360), null), lock: false }] })}>Add color</button>
          <button className="btn" onClick={() => updateState({ pal: state.pal.map((item) => ({ ...item, lock: false })) })}>Unlock all</button>
          <button className="btn" onClick={() => addFavorite("palette", paletteHex, "Palette")}>Save palette</button>
        </div>
        <div className="pal">
          {state.pal.map((color, index) => (
            <div className="sw" key={index}>
              <div className="c" style={{ background: color.h }} />
              <div className="i"><b>{color.h}</b><span>{rgbString(color.h)}</span><span>{hslString(color.h)}</span></div>
              <div className="a">
                <button onClick={() => copy(color.h, color.h + " copied")}>Copy</button>
                <button aria-pressed={color.lock} onClick={() => updateState({ pal: state.pal.map((item, i) => i === index ? { ...item, lock: !item.lock } : item) })}>{color.lock ? "Locked" : "Lock"}</button>
                <button onClick={() => updateState({ pal: state.pal.map((item, i) => i === index ? { h: generateColor(state.mode, i, state.pal.length, random(0, 360), null), lock: false } : item) })}>Redo</button>
                <button onClick={() => { const value = prompt("Enter a HEX color", color.h); const hex = value && normHex(value); if (!value) return; if (!hex) { toast("Invalid HEX"); return; } updateState({ pal: state.pal.map((item, i) => i === index ? { ...item, h: hex } : item) }); }}>Edit</button>
                <button onClick={() => addFavorite("color", color.h, color.h)}>Favorite</button>
                {state.pal.length > 2 && <button onClick={() => updateState({ pal: state.pal.filter((_, i) => i !== index) })}>Remove</button>}
              </div>
            </div>
          ))}
        </div>
        <div className="box" style={{ marginTop: 16 }}>
          <h2>Export palette</h2>
          <div className="tabs-sub">{Object.keys(exports).map((key) => <button className="btn" key={key} onClick={() => setExportType(key)}>{key}</button>)}</div>
          <pre>{exports[exportType]}</pre>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => copy(exports[exportType], "Palette export copied")}>Copy</button>
            <button className="btn" onClick={() => download("palette.txt", exports[exportType], "text/plain")}>Download</button>
          </div>
        </div>
      </>
    );
  }

  function GradientView() {
    const g = state.g;
    const css = gradientCss(g);
    const gradientOutput = () => gradientMode === "bg" ? `background: ${css};` : gradientMode === "bi" ? `background-image: ${css};` : gradientMode === "var" ? `:root {\n  --gradient: ${css};\n}` : [...g.stops].sort((a, b) => a.p - b.p).map((stop) => stop.c).join(", ");
    return (
      <>
        <h1>Gradient Studio</h1><p className="sub">Build linear, radial and conic gradients with live CSS output.</p>
        <div className="grid two">
          <div className="box">
            <div className="prev" style={{ background: css }} />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => copy(gradientOutput(), "CSS copied")}>Copy CSS</button>
              <button className="btn" onClick={() => download("gradient.css", `.gradient {\n  background: ${css};\n}\n`, "text/css")}>Download CSS</button>
              <button className="btn" onClick={() => exportGradientPng(g)}>Export PNG</button>
              <button className="btn" onClick={() => addFavorite("gradient", g, "Gradient")}>Favorite</button>
            </div>
            <pre>{gradientOutput()}</pre>
            <div className="row" style={{ marginTop: 8 }}>
              {[["bg", "background"], ["bi", "background-image"], ["var", "CSS variable"], ["hex", "HEX colors"]].map(([key, label]) => <button className="btn" key={key} onClick={() => { setGradientMode(key); copy(gradientMode === key ? gradientOutput() : (key === "bg" ? `background: ${css};` : key === "bi" ? `background-image: ${css};` : key === "var" ? `:root {\n  --gradient: ${css};\n}` : [...g.stops].sort((a,b)=>a.p-b.p).map(s=>s.c).join(", ")), "Copied"); }}>{label}</button>)}
            </div>
          </div>
          <div className="box">
            <h2>Controls</h2>
            <div className="row">
              <label>Type</label>
              <select value={g.type} onChange={(event) => updateState({ g: { ...g, type: event.target.value } })}>
                <option value="linear">Linear</option><option value="radial">Radial</option><option value="conic">Conic</option>
              </select>
              {g.type === "radial" && <select value={g.shape} onChange={(event) => updateState({ g: { ...g, shape: event.target.value } })}><option value="circle">Circle</option><option value="ellipse">Ellipse</option></select>}
            </div>
            {g.type !== "radial" && <div className="row"><label>Angle</label><input type="range" min="0" max="360" value={g.angle} onChange={(event) => updateState({ g: { ...g, angle: +event.target.value } })} style={{ flex: 1 }} /><input type="number" min="0" max="360" value={g.angle} onChange={(event) => updateState({ g: { ...g, angle: clamp(+event.target.value || 0, 0, 360) } })} /></div>}
            {g.type === "linear" && <div className="row">{[[0,"↑"],[45,"↗"],[90,"→"],[135,"↘"],[180,"↓"],[225,"↙"],[270,"←"],[315,"↖"]].map(([angle, label]) => <button className="btn" key={angle} onClick={() => updateState({ g: { ...g, angle } })}>{label}</button>)}</div>}
            <h2 style={{ marginTop: 12 }}>Color stops</h2>
            {g.stops.map((stop, index) => (
              <div className="stop" key={index}>
                <input type="color" value={stop.c.toLowerCase()} onChange={(event) => updateState({ g: { ...g, stops: g.stops.map((item, i) => i === index ? { ...item, c: normHex(event.target.value) } : item) } })} />
                <input type="number" min="0" max="100" value={stop.p} onChange={(event) => updateState({ g: { ...g, stops: g.stops.map((item, i) => i === index ? { ...item, p: clamp(+event.target.value || 0, 0, 100) } : item) } })} />%
                {g.stops.length > 2 && <button className="btn" onClick={() => updateState({ g: { ...g, stops: g.stops.filter((_, i) => i !== index) } })}>✕</button>}
              </div>
            ))}
            <div className="row"><button className="btn" onClick={() => g.stops.length < 12 && updateState({ g: { ...g, stops: [...g.stops, { c: hslToHex(random(0,360),75,55), p: 100 }] } })}>Add stop</button><button className="btn pri" onClick={() => randomizeGradient(g)}>Randomize</button></div>
          </div>
        </div>
      </>
    );
  }

  function harmonies(hex) {
    const [h, s, l] = hexToHsl(hex);
    const make = (offsets) => offsets.map((offset) => hslToHex(h + offset, s, l));
    return {
      Complementary: make([0, 180]),
      Analogous: make([-30, 0, 30]),
      "Split complementary": make([0, 150, 210]),
      Triadic: make([0, 120, 240]),
      Tetradic: make([0, 90, 180, 270]),
      Monochromatic: [20, 35, 50, 65, 80].map((lightness) => hslToHex(h, s, lightness)),
    };
  }

  function HarmonyView() {
    const palettes = harmonies(state.base);
    return (
      <>
        <h1>Color harmony</h1><p className="sub">Pick a base color to see related palettes.</p>
        <div className="bar">
          <input type="color" value={state.base.toLowerCase()} onChange={(event) => updateState({ base: normHex(event.target.value) || state.base })} />
          <input type="text" value={state.base} onChange={(event) => { const hex = normHex(event.target.value); if (hex) updateState({ base: hex }); }} style={{ width: 110 }} />
        </div>
        <div className="grid">
          {Object.entries(palettes).map(([name, colors]) => (
            <div className="box" key={name}>
              <h2>{name}</h2>
              <div className="pal">{colors.map((color) => <button className="sw" key={color} onClick={() => copy(color, color + " copied")} style={{ cursor: "pointer", textAlign: "left", padding: 0 }}><div className="c" style={{ background: color, height: 80 }} /><div className="i"><b>{color}</b></div></button>)}</div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => { updateState({ pal: colors.map((h) => ({ h, lock: false })), tab: "palette" }); setHistory((items) => [{ kind: "palette", data: colors, label: "Harmony palette", t: Date.now() }, ...items].slice(0, 20)); }}>Open in generator</button>
                <button className="btn" onClick={() => addFavorite("palette", colors, "Harmony palette")}>Save palette</button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  function suggestForeground(bg, target) {
    const [h, s, l] = hexToHsl(state.fg);
    const direction = luminance(bg) > .5 ? -1 : 1;
    for (let i = 0; i <= 100; i++) {
      const candidate = hslToHex(h, s, clamp(l + direction * i, 0, 100));
      if (contrast(candidate, bg) >= target) return candidate;
    }
    return direction > 0 ? "#FFFFFF" : "#000000";
  }

  function ContrastView() {
    const ratio = contrast(state.fg, state.bg);
    const rows = [["AA normal text", 4.5], ["AA large text", 3], ["AAA normal text", 7], ["AAA large text", 4.5]];
    return (
      <>
        <h1>Contrast checker</h1><p className="sub">WCAG 2.x relative luminance ratio.</p>
        <div className="grid two">
          <div className="box">
            <div className="row"><label>Text</label><input type="color" value={state.fg.toLowerCase()} onChange={(event) => updateState({ fg: normHex(event.target.value) || state.fg })} /><input type="text" value={state.fg} onChange={(event) => { const hex = normHex(event.target.value); if (hex) updateState({ fg: hex }); }} style={{ width: 100 }} /><button className="btn" onClick={() => updateState({ fg: state.bg, bg: state.fg })}>Swap</button></div>
            <div className="row"><label>Background</label><input type="color" value={state.bg.toLowerCase()} onChange={(event) => updateState({ bg: normHex(event.target.value) || state.bg })} /><input type="text" value={state.bg} onChange={(event) => { const hex = normHex(event.target.value); if (hex) updateState({ bg: hex }); }} style={{ width: 100 }} /></div>
            <div style={{ background: state.bg, color: state.fg, padding: 20, borderRadius: 12, border: "1px solid var(--bd)", marginTop: 8 }}><div style={{ fontSize: 32, fontWeight: 700 }}>Large text sample</div><div>Normal body text sample for readability.</div></div>
          </div>
          <div className="box">
            <h2 style={{ fontSize: 28, margin: "0 0 10px" }}>{ratio.toFixed(2)}:1</h2>
            {rows.map(([name, target]) => <div className="row" style={{ justifyContent: "space-between" }} key={name}><span>{name} ({target}:1)</span><span className={`badge ${ratio >= target ? "ok" : "no"}`}>{ratio >= target ? "✓ Pass" : "✕ Fail"}</span></div>)}
            {ratio < 4.5 && <><h2 style={{ marginTop: 12 }}>Accessible alternatives</h2><div className="row">{[4.5, 7].map((target) => { const candidate = suggestForeground(state.bg, target); return <button className="btn" key={target} onClick={() => updateState({ fg: candidate })}><span style={{ display: "inline-block", width: 14, height: 14, background: candidate, borderRadius: 4, verticalAlign: "middle", border: "1px solid var(--bd)" }} /> {candidate} ({contrast(candidate, state.bg).toFixed(1)}:1)</button>; })}</div></>}
          </div>
        </div>
      </>
    );
  }

  function PlaygroundView() {
    const [a, b, c] = [paletteHex[0], paletteHex[1] || paletteHex[0], paletteHex[2] || paletteHex[0]];
    const bg = previewDark ? "#0B0B0F" : "#FFFFFF";
    const tx = previewDark ? "#F4F4F5" : "#18181B";
    const card = previewDark ? "#17171C" : "#F4F4F5";
    const textFor = (hex) => contrast("#FFFFFF", hex) >= contrast("#000000", hex) ? "#FFFFFF" : "#000000";
    return (
      <>
        <h1>Live playground</h1><p className="sub">Your current palette and gradient on a sample interface.</p>
        <div className="bar"><button className="btn" onClick={() => setPreviewDark((value) => !value)}>{previewDark ? "Switch to light preview" : "Switch to dark preview"}</button></div>
        <div style={{ background: bg, color: tx, borderRadius: 14, border: "1px solid var(--bd)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--bd)" }}><b style={{ color: a }}>Brand</b><span style={{ display: "flex", gap: 14, fontSize: 14 }}><span>Product</span><span>Pricing</span><span>Docs</span></span></div>
          <div style={{ background: gradientCss(state.g), padding: "48px 20px", textAlign: "center" }}><h2 style={{ margin: "0 0 8px", fontSize: 28, color: "#fff" }}>Design with confidence</h2><p style={{ margin: "0 0 16px", color: "#fff" }}>A hero section using your gradient.</p><span style={{ display: "inline-block", background: a, color: textFor(a), padding: "10px 18px", borderRadius: 8, fontWeight: 600 }}>Get started</span></div>
          <div style={{ padding: 20, display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
            {[a, b, c].map((hex, index) => <div key={index} style={{ background: card, padding: 16, borderRadius: 12, borderTop: `4px solid ${hex}` }}><span style={{ background: hex, color: textFor(hex), padding: "2px 8px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>Badge {index + 1}</span><h3 style={{ margin: "10px 0 4px" }}>Card title</h3><p style={{ margin: 0, opacity: .7, fontSize: 14 }}>Supporting copy for this card.</p></div>)}
            <div style={{ background: card, padding: 16, borderRadius: 12 }}><label style={{ fontSize: 13, opacity: .7 }}>Email</label><input type="text" placeholder="you@example.com" style={{ width: "100%", margin: "6px 0 10px", background: "transparent", color: tx, borderColor: b }} /><span style={{ display: "inline-block", background: b, color: textFor(b), padding: "8px 14px", borderRadius: 8, fontWeight: 600 }}>Subscribe</span></div>
          </div>
        </div>
      </>
    );
  }

  function LibraryView() {
    const categories = ["All", ...new Set(PRESETS.map((preset) => preset.cat))];
    let content;
    if (state.libTab === "presets") {
      const presets = category === "All" ? PRESETS : PRESETS.filter((preset) => preset.cat === category);
      content = (
        <>
          <div className="tabs-sub">{categories.map((cat) => <button className="btn" key={cat} style={category === cat ? { borderColor: "var(--ac)" } : undefined} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
          <div className="cards">{presets.map((preset) => <div className="pc" key={preset.name}><div className="g" style={{ background: gradientCss(preset.g) }} onClick={() => { updateState({ g: JSON.parse(JSON.stringify(preset.g)), tab: "gradient" }); setHistory((items) => [{ kind: "gradient", data: preset.g, label: preset.name, t: Date.now() }, ...items].slice(0, 20)); }} /><div className="m"><span>{preset.name}<br /><small>{preset.g.stops.map((stop) => stop.c).join(" ")}</small></span></div><div className="m"><button onClick={() => copy(`background: ${gradientCss(preset.g)};`, "CSS copied")}>Copy CSS</button><button onClick={() => addFavorite("gradient", preset.g, preset.name)}>Favorite</button></div></div>)}</div>
        </>
      );
    } else if (state.libTab === "favorites") {
      const filtered = favorites.filter((item) => (!search || (item.label + JSON.stringify(item.data)).toLowerCase().includes(search.toLowerCase())) && (favoriteType === "all" || item.kind === favoriteType));
      content = (
        <>
          <div className="bar"><input type="text" placeholder="Search favorites" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={favoriteType} onChange={(event) => setFavoriteType(event.target.value)}><option value="all">all</option><option value="color">color</option><option value="palette">palette</option><option value="gradient">gradient</option></select></div>
          {filtered.length ? <div className="cards">{filtered.map((item, index) => <div className="pc" key={index}><div className="g" style={{ background: item.kind === "color" ? item.data : item.kind === "gradient" ? gradientCss(item.data) : `linear-gradient(90deg, ${item.data.join(", ")})` }} onClick={() => { if (item.kind === "gradient") updateState({ g: JSON.parse(JSON.stringify(item.data)), tab: "gradient" }); else { const colors = item.kind === "color" ? [item.data] : item.data; updateState({ pal: colors.map((h) => ({ h, lock: false })), tab: "palette" }); } }} /><div className="m"><span>{item.label}<br /><small>{item.kind}</small></span><button onClick={() => setFavorites((items) => items.filter((_, i) => i !== index))}>Remove</button></div></div>)}</div> : <div className="empty">No favorites match your filters.</div>}
        </>
      );
    } else {
      content = (
        <>
          <div className="bar"><button className="btn" onClick={() => { setHistory([]); toast("History cleared"); }}>Clear history</button></div>
          {history.length ? <div className="cards">{history.map((item, index) => <div className="pc" key={index}><div className="g" style={{ background: item.kind === "gradient" ? gradientCss(item.data) : `linear-gradient(90deg, ${item.data.join(", ")})` }} onClick={() => { if (item.kind === "gradient") updateState({ g: JSON.parse(JSON.stringify(item.data)), tab: "gradient" }); else updateState({ pal: item.data.map((h) => ({ h, lock: false })), tab: "palette" }); }} /><div className="m"><span>{item.label}<br /><small>{item.kind}</small></span></div></div>)}</div> : <div className="empty">History is empty. Generate a palette or gradient to start.</div>}
        </>
      );
    }
    return (
      <>
        <h1>Library</h1><p className="sub">Presets, favorites and recent work.</p>
        <div className="tabs-sub">{[["presets", "Presets"], ["favorites", `Favorites (${favorites.length})`], ["history", "History"]].map(([key, label]) => <button className="btn" key={key} style={state.libTab === key ? { borderColor: "var(--ac)" } : undefined} onClick={() => updateState({ libTab: key })}>{label}</button>)}</div>
        {content}
      </>
    );
  }

  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && !window.matchMedia("(prefers-color-scheme: light)").matches);
    document.documentElement.dataset.theme = isDark ? "light" : "dark";
  }

  function activeView() {
    if (state.tab === "palette") return <PaletteView />;
    if (state.tab === "gradient") return <GradientView />;
    if (state.tab === "harmony") return <HarmonyView />;
    if (state.tab === "contrast") return <ContrastView />;
    if (state.tab === "playground") return <PlaygroundView />;
    return <LibraryView />;
  }

  return (
    <>
      <header>
        <span className="logo">ColorCraft Studio</span>
        <nav role="tablist">{TABS.map(([key, label]) => <button key={key} role="tab" aria-selected={state.tab === key} onClick={() => setTab(key)}>{label}</button>)}</nav>
        <button className="btn" onClick={toggleTheme} aria-label="Toggle light or dark theme">Theme</button>
      </header>
      <main>{activeView()}</main>
      <div id="toast" role="status" aria-live="polite" className={toastText ? "on" : ""}>{toastText}</div>
    </>
  );
}
