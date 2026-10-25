/* TACTILE TYPE — 色・文字・余白・質感はこの設定から変更します。 */
(() => {
  'use strict';
  const tokens = {
    colors: {
      paper: '#f4efe6', ink: '#181614', pink: '#ff3d81', blue: '#2f4bff', yellow: '#ffe14d',
      white: '#fffdf8', error: '#9b163b', clear: '#00000000', backdrop: '#181614d9',
      light: { surface: '#f4efe6', raised: '#fffbf4', text: '#181614', secondary: '#5a514a', border: '#777066', blueText: '#263edf', pinkText: '#a90944', dock: '#f4efe6ed' },
      dark: { surface: '#121110', raised: '#211e1b', text: '#f4efe6', secondary: '#c7bcb0', border: '#a99e90', blueText: '#a9b7ff', pinkText: '#ff8fb7', dock: '#121110ed' },
    },
    fonts: {
      sans: '"Arial", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif',
      mono: '"Courier New", "BIZ UDGothic", "Meiryo", monospace',
      hand: '"Segoe Print", "Comic Sans MS", "Yu Gothic", cursive',
    },
    type: { body: 16, small: 16, label: 16, micro: 12, headingSmall: 72, headingLarge: 46, desktopSmall: 92, desktopLarge: 136, cardName: 200, cardNameMin: 48, cardBody: 30, cardLabel: 24, cardMeta: 23, cardCommunity: 44, cardSerial: 32, cardScript: 28, cardTitle: 34, cardTitleLarge: 36, cardDense: 31, cardMessage: 32, cardStatus: 28, cardMarker: 26, cardStrip: 40, cardMin: 20, cardMinSmall: 22, cardMinLabel: 24, cardMinDense: 25, cardMinTitle: 26, cardMinLarge: 28 },
    space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, section: 40, wide: 48, giant: 64 },
    layout: { maxWidth: 1200, mobileGutter: 5, border: 1.5, strongBorder: 3, radius: 2, inputHeight: 56, touch: 44, thumbWidth: 180, dockHeight: 136, stickyOffset: 8, compactWidth: 220, saveMaxWidth: 680, dialogMaxWidth: 1040, rangeLabel: 104, rangeValue: 58, perspective: 1000 },
    texture: { tileSize: 256, pageOpacity: .075, cardOpacity: .085, grainFieldOpacity: .12, foilOpacity: .075, liquidOpacity: .025, seed: 13671, offset: 2, tilt: 1.3, shadow: '#1816142e' },
    motion: { flip: 260, press: 180 },
    card: { width: 1600, height: 1000, margin: 64, gap: 32, nameLeading: 1.04, bodyLeading: 1.4, tilt: .65 },
    styles: {
      y3k: { label: 'Y3K LIQUID', subtitle: '流れるクローム・未来感', paper: '#101526', ink: '#f2f6ff', muted: '#cad4ef', primary: '#a6baff', secondary: '#d8f3fa', plate: '#19213a', stroke: '#98adcf', onPrimary: '#11182b', metal: ['#202c48', '#e6f4ff', '#7185a7', '#ffffff', '#354260', '#aebfe3', '#18213b'] },
      kawaii: { label: 'STICKER BOMB', subtitle: '切り抜き・落書き', paper: '#e7dfe9', ink: '#22182a', muted: '#53445a', primary: '#ff3d81', secondary: '#2f4bff', plate: '#fffdf8', stroke: '#22182a', onPrimary: '#22182a' },
      chrome: { label: 'TYPE POSTER', subtitle: '巨大文字・蛍光インク', paper: '#e9ece3', ink: '#161713', muted: '#4c5046', primary: '#c5ff31', secondary: '#161713', plate: '#f8faf3', stroke: '#161713', onPrimary: '#161713' },
      aurora: { label: 'GRAIN FIELD', subtitle: 'フィルム・ざらめく光', paper: '#2c233a', ink: '#fff9ed', muted: '#eee1d5', primary: '#693949', secondary: '#144e54', plate: '#2c233a', stroke: '#eee1d5', onPrimary: '#fff9ed' },
      pixel: { label: 'SPEC SHEET', subtitle: '仕様書・グリッド', paper: '#e9eee4', ink: '#18312a', muted: '#455a50', primary: '#a3c3ac', secondary: '#245445', plate: '#f5f5e9', stroke: '#18312a', onPrimary: '#18312a' },
      pop: { label: 'PAPER CUT', subtitle: '重ね紙・やわらかな影', paper: '#e4d7c4', ink: '#302e28', muted: '#595347', primary: '#b66e57', secondary: '#688077', plate: '#f5eee1', stroke: '#595347', onPrimary: '#302e28' },
      holo: { label: 'MATTE FOIL', subtitle: '墨紙・名前だけの箔', paper: '#151414', ink: '#f4efe6', muted: '#cac2b7', primary: '#dec18a', secondary: '#e2c8ac', plate: '#24211f', stroke: '#9a9082', onPrimary: '#151414', foil: ['#dbc29a', '#fff2d7', '#bf9d69', '#f9e3b5', '#d2b58b'] },
    },
  };
  const freeze = (object) => { Object.values(object).forEach(value => { if (value && typeof value === 'object') freeze(value); }); return Object.freeze(object); };
  window.TACTILE_TOKENS = freeze(tokens);
  const root = document.documentElement;
  const set = (key, value) => root.style.setProperty(`--${key}`, value);
  Object.entries(tokens.space).forEach(([name, value]) => set(`space-${name}`, `${value}px`));
  Object.entries(tokens.type).forEach(([name, value]) => set(`type-${name}`, `${value}px`));
  Object.entries(tokens.fonts).forEach(([name, value]) => set(`font-${name}`, value));
  Object.entries(tokens.layout).forEach(([name, value]) => set(`layout-${name}`, `${value}px`));
  ['paper', 'ink', 'pink', 'blue', 'yellow', 'white'].forEach(name => set(name, tokens.colors[name]));
  set('error', tokens.colors.error);
  set('backdrop', tokens.colors.backdrop);
  set('grain-opacity', tokens.texture.pageOpacity);
  set('flip-duration', `${tokens.motion.flip}ms`);
  set('press-duration', `${tokens.motion.press}ms`);
  set('tilt', `${tokens.texture.tilt}deg`);
  set('page-width', `${100-2*tokens.layout.mobileGutter}vw`);
  const media = matchMedia('(prefers-color-scheme: dark)');
  function applyScheme() {
    root.dataset.colorScheme = media.matches ? 'dark' : 'light';
    Object.entries(media.matches ? tokens.colors.dark : tokens.colors.light).forEach(([name, value]) => set(name, value));
  }
  applyScheme();
  if (media.addEventListener) media.addEventListener('change', applyScheme);
  else media.addListener(applyScheme);
})();
