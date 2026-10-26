/* PUBLICK WORLD — 色・文字・余白・質感はこの設定から変更します。 */
(() => {
  'use strict';
  const tokens = {
    colors: {
      paper: '#f4efe6', ink: '#181614', pink: '#ff3d81', blue: '#2f4bff', yellow: '#ffe14d',
      white: '#fffdf8', error: '#f5a0b8', clear: '#00000000', backdrop: '#181614d9',
      dark: { surface: '#0a0a0c', raised: '#16161a', text: '#f5f5f7', secondary: '#a2a2ad', border: '#646470', hair: '#ffffff14', accent: '#c9b8ff', accentHover: '#dbceff', onAccent: '#191321', blueText: '#c9b8ff', pinkText: '#f5a0b8', dock: '#0a0a0ced', shine: '#f2e7ff80', cardShadow: '0 20px 60px #00000055' },
    },
    fonts: {
      brand: 'Arial, Helvetica, sans-serif',
      sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif',
      mono: 'ui-monospace, "SFMono-Regular", "Cascadia Code", "BIZ UDGothic", "Meiryo", monospace',
      hand: '"Segoe Print", "Comic Sans MS", "Yu Gothic", cursive',
    },
    type: { body: 16, small: 16, label: 16, micro: 12, headingSmall: 52, headingLarge: 38, desktopSmall: 76, desktopLarge: 104, cardName: 200, cardNameMin: 48, cardBody: 30, cardLabel: 24, cardMeta: 23, cardCommunity: 44, cardSerial: 32, cardScript: 28, cardTitle: 34, cardTitleLarge: 36, cardDense: 31, cardMessage: 32, cardStatus: 28, cardMarker: 26, cardStrip: 40, cardMin: 20, cardMinSmall: 22, cardMinLabel: 24, cardMinDense: 25, cardMinTitle: 26, cardMinLarge: 28 },
    space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, section: 40, wide: 48, giant: 64 },
    layout: { maxWidth: 1200, mobileGutter: 5, border: 1, strongBorder: 2, radius: 20, inputRadius: 14, miniRadius: 12, cardRadius: 16, inputHeight: 56, touch: 44, thumbWidth: 220, dockHeight: 136, stickyOffset: 8, compactWidth: 220, saveMaxWidth: 680, dialogMaxWidth: 1040, rangeLabel: 104, rangeValue: 58, perspective: 1000 },
    texture: { tileSize: 256, pageOpacity: 0, sheetOpacity: .025, seed: 13671, offset: 2, tilt: 0, shadow: '#1816142e' },
    material: { markSize: 384, foilWidth: 448, foilHeight: 280, lightZ: 1.25, specularPower: 80, cacheEntries: 8 },
    motion: { flip: 260, press: 180, issue: 650 },
    card: { width: 1600, height: 1000, margin: 64, gap: 32, nameLeading: 1.04, bodyLeading: 1.4, tilt: .65 },
    styles: {
      'y3k-liquid': { label: 'Y3K LIQUID', subtitle: '流れるクローム・未来感', paper: '#101526', ink: '#f2f6ff', muted: '#cad4ef', primary: '#a6baff', secondary: '#d8f3fa', plate: '#19213a', stroke: '#98adcf', onPrimary: '#11182b', metal: ['#202c48', '#e6f4ff', '#7185a7', '#ffffff', '#354260', '#aebfe3', '#18213b'] },
      'holo-idol': { label: 'HOLO IDOL', subtitle: 'ホロ箔・推しの1枚', paper: '#e7e4f6', ink: '#292342', muted: '#51475f', primary: '#8678bb', secondary: '#b3dbdf', plate: '#f8f6ff', stroke: '#80719d', onPrimary: '#1c1730', foil: ['#eef2ff', '#b2d5f3', '#ebc5f4', '#c4e8e0', '#d7c5fa'] },
      'setting-sheet': { label: '設定資料', subtitle: '設定画・色指定チップ', paper: '#f3f2ed', ink: '#252b36', muted: '#58616e', primary: '#d8e2ea', secondary: '#5c7590', plate: '#fffefa', stroke: '#788593', onPrimary: '#252b36' },
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
  set('issue-duration', `${tokens.motion.issue}ms`);
  set('tilt', `${tokens.texture.tilt}deg`);
  set('page-width', `${100-2*tokens.layout.mobileGutter}vw`);
  root.dataset.colorScheme = 'dark';
  Object.entries(tokens.colors.dark).forEach(([name, value]) => set(name, value));
})();
