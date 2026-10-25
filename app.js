(() => {
  'use strict';

  const config = window.CARD_CONFIG;
  const $ = (id) => document.getElementById(id);
  const canvas = $('card-canvas');
  const ctx = canvas.getContext('2d');
  const FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif';
  const MONO = '"Courier New", monospace';
  const WIDTH = 1600;
  const HEIGHT = 1000;
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null;
  const characters = (text) => segmenter
    ? Array.from(segmenter.segment(text), (item) => item.segment) : Array.from(text);
  const clean = (text) => text.normalize('NFC').replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim();
  const themes = {
    y3k: { label: 'AESTHETIC × Y3K', base: '#d4dcff', ink: '#29294b', muted: '#535674', accent: '#605391', panel: '#ffffffdf', soft: '#e7e1f8', bright: '#b8e9e4' },
    kawaii: { label: 'NEO KAWAII × GLASS', base: '#f6d7ea', ink: '#4b244b', muted: '#715475', accent: '#a1407f', panel: '#fffcffdf', soft: '#f3d8ed', bright: '#d5f4be' },
    chrome: { label: 'CYBER × CHROME', base: '#132036', ink: '#f2faff', muted: '#b8c9dd', accent: '#a5e9f0', panel: '#15263aee', soft: '#2b4357', bright: '#9eedf8' },
    aurora: { label: 'DREAM × AURORA', base: '#283754', ink: '#f8f6ff', muted: '#ccdeea', accent: '#b4f3df', panel: '#26304dea', soft: '#3a4a68', bright: '#c4b3f2' },
    pixel: { label: 'PIXEL × INTERNET', base: '#d8eddf', ink: '#254333', muted: '#4e6556', accent: '#356b53', panel: '#f1faeff5', soft: '#d1e7cb', bright: '#f4c884' },
    pop: { label: 'SOFT × POP', base: '#ffe1c5', ink: '#4d332e', muted: '#79554d', accent: '#a94b35', panel: '#fff8eeed', soft: '#f9d5bd', bright: '#bdd8f2' },
    holo: { label: 'MONO × HOLOGRAM', base: '#e4e5ec', ink: '#2e3044', muted: '#5b5e72', accent: '#555976', panel: '#fffffff0', soft: '#e5e4ee', bright: '#c0dfd7' },
  };
  const state = { avatar: null, zoom: 1, x: 0, y: 0, frame: 0, imageRequest: 0, loading: false, saving: false, finishedUrl: null };
  const fields = [
    { id: 'member-name', error: 'name-error', max: 32, label: 'お名前', required: true },
    { id: 'member-title', error: 'title-error', max: 18, label: '肩書き' },
    { id: 'member-likes', error: 'likes-error', max: 48, label: 'すきなもの' },
    { id: 'member-message', error: 'message-error', max: 60, label: 'ひとこと' },
  ];

  document.querySelectorAll('[data-community-name]').forEach((element) => { element.textContent = config.communityName; });
  document.title = `会員証をつくる | ${config.communityName}`;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  function getValues() {
    return {
      name: clean($('member-name').value), title: clean($('member-title').value),
      likes: clean($('member-likes').value), message: clean($('member-message').value),
      status: $('member-status').value,
      theme: document.querySelector('input[name="theme"]:checked').value,
    };
  }

  function validate(showRequired = false) {
    let valid = true;
    for (const field of fields) {
      const input = $(field.id);
      const value = clean(input.value);
      const length = characters(value).length;
      let message = '';
      if (field.required && !value) {
        valid = false;
        if (showRequired) message = '呼ばれたい名前を入力してください。';
      }
      if (length > field.max) {
        valid = false;
        message = `${field.label}は${field.max}文字までです（現在${length}文字）。`;
      }
      $(field.error).textContent = message;
      $(field.error).hidden = !message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    $('download-button').disabled = !valid || state.loading || state.saving;
    $('show-button').disabled = !valid || state.loading || state.saving;
    $('save-hint').textContent = state.loading ? 'アイコンを読み込んでいます。'
      : state.saving ? '画像を準備しています。'
      : valid ? '保存できないときは「画像を表示」から長押しで保存。'
      : clean($('member-name').value) ? '入力欄の文字数をご確認ください。' : 'お名前を入れると保存できます。';
    return valid;
  }

  function roundRect(x, y, w, h, r = 24) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function panel(x, y, w, h, fill, radius = 28, border = '#ffffff90') {
    roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke();
  }

  function linear(stops, x1 = 0, y1 = 0, x2 = WIDTH, y2 = HEIGHT) {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    stops.forEach(([position, color]) => gradient.addColorStop(position, color));
    return gradient;
  }

  function glow(x, y, r, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, color); gradient.addColorStop(1, `${color.slice(0, 7)}00`);
    ctx.fillStyle = gradient; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function star(x, y, size, color, rotation = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.beginPath();
    ctx.moveTo(0, -size); ctx.quadraticCurveTo(size * .14, -size * .14, size, 0);
    ctx.quadraticCurveTo(size * .14, size * .14, 0, size);
    ctx.quadraticCurveTo(-size * .14, size * .14, -size, 0);
    ctx.quadraticCurveTo(-size * .14, -size * .14, 0, -size);
    ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }

  function ring(x, y, rx, ry, color, thickness = 25, rotation = -.35) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = Array.isArray(color) ? linear(color, -rx, -ry, rx, ry) : color;
    ctx.lineWidth = thickness; ctx.stroke(); ctx.restore();
  }

  function heart(x, y, size, color, rotation = .2) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.beginPath();
    ctx.moveTo(0, size * .8); ctx.bezierCurveTo(-size * 1.8, -size * .2, -size * .6, -size * 1.4, 0, -size * .5);
    ctx.bezierCurveTo(size * .6, -size * 1.4, size * 1.8, -size * .2, 0, size * .8);
    ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }

  function background(key, p) {
    ctx.fillStyle = p.base; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (key === 'y3k') {
      ctx.fillStyle = linear([[0, '#a9bdf1'], [.42, '#eee2fa'], [.72, '#c3e8ec'], [1, '#b5c7ff']]); ctx.fillRect(0, 0, WIDTH, HEIGHT);
      glow(1330, 200, 500, '#b19bed'); glow(250, 850, 400, '#bbf4ec');
      const chrome = [[0, '#ffffff'], [.23, '#9badd8'], [.5, '#faffff'], [.74, '#a29bc7'], [1, '#ffffff']];
      ring(1320, 200, 220, 90, chrome, 54, -.42); star(1380, 170, 68, '#ffffffdd'); star(120, 740, 42, '#ffffff');
      ctx.strokeStyle = '#ffffff45'; ctx.lineWidth = 1;
      for (let x = 0; x < WIDTH; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
      for (let y = 0; y < HEIGHT; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
    } else if (key === 'kawaii') {
      ctx.fillStyle = linear([[0, '#ffd7ed'], [.5, '#e6deff'], [1, '#d7f3e7']]); ctx.fillRect(0, 0, WIDTH, HEIGHT);
      glow(80, 180, 350, '#ffb6dc'); glow(1400, 850, 500, '#c9f1c6');
      heart(1350, 165, 120, '#ffffff85', .25); heart(155, 770, 55, '#f8a7d8', -.2);
      ring(1460, 790, 170, 170, '#ffffff60', 35, 0); star(1200, 80, 28, '#ffffff');
      for (let i = 0; i < 13; i++) { ctx.beginPath(); ctx.arc(55 + i * 130, 220 + ((i * 79) % 620), 6, 0, Math.PI * 2); ctx.fillStyle = '#ffffffaa'; ctx.fill(); }
    } else if (key === 'chrome') {
      ctx.fillStyle = linear([[0, '#0c1527'], [.52, '#304258'], [1, '#111b2d']]); ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = '#9cdef426'; ctx.lineWidth = 1;
      for (let x = 0; x < WIDTH; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
      for (let y = 0; y < HEIGHT; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
      const metal = [[0, '#4a6380'], [.3, '#e0f4ff'], [.48, '#7292ac'], [.55, '#172338'], [.74, '#b1edfd'], [1, '#5d7a8e']];
      ring(1340, 210, 220, 150, metal, 58, -.5); star(1360, 170, 58, '#d8fcff');
      ctx.strokeStyle = '#abeef0'; ctx.lineWidth = 3;
      [[34, 34, 1, 1], [1566, 34, -1, 1], [34, 966, 1, -1], [1566, 966, -1, -1]].forEach(([x, y, dx, dy]) => { ctx.beginPath(); ctx.moveTo(x + dx * 90, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * 90); ctx.stroke(); });
    } else if (key === 'aurora') {
      ctx.fillStyle = linear([[0, '#212c4b'], [.55, '#504a7e'], [1, '#1e465d']]); ctx.fillRect(0, 0, WIDTH, HEIGHT);
      glow(500, 100, 650, '#568eae'); glow(1370, 440, 600, '#9e6dbe'); glow(500, 1000, 600, '#4eaf9d');
      ctx.save(); ctx.filter = 'blur(25px)';
      ctx.strokeStyle = '#a4e4d477'; ctx.lineWidth = 90; ctx.beginPath(); ctx.moveTo(-100, 850); ctx.bezierCurveTo(400, 300, 1000, 300, 1700, 60); ctx.stroke(); ctx.restore();
      for (let i = 0; i < 65; i++) { const x = (i * 293 + 53) % WIDTH; const y = (i * 137 + 43) % HEIGHT; ctx.fillStyle = i % 3 ? '#ffffff85' : '#d3eaff'; ctx.beginPath(); ctx.arc(x, y, i % 3 ? 1.4 : 2.8, 0, Math.PI * 2); ctx.fill(); }
      star(1370, 145, 30, '#e5fff2'); star(1450, 230, 12, '#e5fff2');
    } else if (key === 'pixel') {
      ctx.fillStyle = '#d9ecdf'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = '#6d967528'; ctx.lineWidth = 2;
      for (let x = 0; x < WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
      for (let y = 0; y < HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
      ctx.fillStyle = '#8db49b'; ctx.fillRect(28, 27, 1544, 25);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#f8ddd1', '#f6efc2', '#cfecd0'][i]; ctx.fillRect(1482 + i * 25, 32, 15, 15); }
      const pixelStar = (x, y, c) => { ctx.fillStyle = c; [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]].forEach(([dx, dy]) => ctx.fillRect(x + dx * 15, y + dy * 15, 15, 15)); };
      pixelStar(1310, 110, '#6b987a'); pixelStar(1400, 750, '#e5b56b'); pixelStar(80, 700, '#94bda0');
    } else if (key === 'pop') {
      ctx.fillStyle = '#ffe5d0'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#f3bb99'; ctx.beginPath(); ctx.arc(1450, 0, 370, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0d8ef'; ctx.beginPath(); ctx.arc(60, 980, 300, 0, Math.PI * 2); ctx.fill();
      star(1350, 170, 100, '#faf0b2', .2); ring(1470, 740, 180, 180, '#a8c9d8', 25, 0);
      ctx.save(); ctx.translate(110, 185); ctx.rotate(-.35); panel(-65, -15, 130, 30, '#f3bc92', 15, '#f3bc92'); ctx.restore();
    } else {
      ctx.fillStyle = linear([[0, '#eeeef4'], [.38, '#d7dbe3'], [.7, '#f5f6fa'], [1, '#c3cad7']]); ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const holo = [[0, '#dcc3ef'], [.2, '#b9dfee'], [.4, '#c2edd1'], [.6, '#fbebc7'], [.8, '#e5c4d9'], [1, '#cbc9f1']];
      ring(1330, 200, 220, 130, holo, 78, -.3); star(1370, 160, 56, '#ffffff');
      ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = linear(holo); ctx.fillRect(0, 780, WIDTH, 220); ctx.restore();
      for (let i = 0; i < 16; i++) { ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1040 + i * 22, -30); ctx.lineTo(1550 + i * 22, 1000); ctx.stroke(); }
    }
    ctx.strokeStyle = key === 'chrome' || key === 'aurora' ? '#ffffff40' : '#ffffffb0';
    ctx.lineWidth = 3; roundRect(18, 18, 1564, 964, key === 'pixel' ? 0 : 28); ctx.stroke();
  }

  function linesFor(text, width) {
    const lines = []; let line = '';
    for (const char of characters(text)) {
      if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = char; }
      else line += char;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  // Text is fitted using the same font and canvas used for the exported PNG.
  function fitted(text, x, y, width, maxLines, size, minSize, color, weight = 600, lineHeight = 1.4) {
    let lines;
    for (; size >= minSize; size--) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      lines = linesFor(text, width);
      if (lines.length <= maxLines) break;
    }
    ctx.font = `${weight} ${Math.max(size, minSize)}px ${FONT}`;
    ctx.fillStyle = color; ctx.textBaseline = 'top';
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * Math.max(size, minSize) * lineHeight));
    return { lines: lines.length, size: Math.max(size, minSize) };
  }

  function avatar(p, key) {
    const x = 96; const y = 292; const diameter = 292;
    ctx.save();
    ctx.shadowColor = key === 'chrome' || key === 'aurora' ? '#00000040' : '#6b628329'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
    ctx.beginPath(); ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2 + 10, 0, Math.PI * 2); ctx.fillStyle = '#ffffffbb'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = p.soft; ctx.fillRect(x, y, diameter, diameter);
    if (state.avatar) {
      const image = state.avatar;
      const scale = Math.max(diameter / image.width, diameter / image.height) * state.zoom;
      const w = image.width * scale; const h = image.height * scale;
      const dx = x + (diameter - w) / 2 - (state.x / 100) * ((w - diameter) / 2);
      const dy = y + (diameter - h) / 2 - (state.y / 100) * ((h - diameter) / 2);
      ctx.drawImage(image, dx, dy, w, h);
    } else {
      ctx.fillStyle = p.bright; ctx.beginPath(); ctx.arc(x + 146, y + 330, 145, 0, Math.PI * 2); ctx.fill();
      star(x + 146, y + 125, 75, p.accent, .1);
      ctx.fillStyle = p.soft; ctx.beginPath(); ctx.arc(x + 128, y + 123, 5, 0, Math.PI * 2); ctx.arc(x + 164, y + 123, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffffdd'; ctx.stroke();
    ctx.fillStyle = p.muted; ctx.font = `bold 18px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('HELLO, INTERNET.', 242, 626); ctx.textAlign = 'left';
    star(365, 575, 30, p.bright, .2);
  }

  function render() {
    state.frame = 0;
    const values = getValues(); const p = themes[values.theme];
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    background(values.theme, p);
    ctx.fillStyle = p.ink; ctx.font = `bold 23px ${MONO}`; ctx.fillText('MEMBERSHIP CARD', 76, 72);
    fitted(config.communityName, 74, 126, 1170, 1, 47, 20, p.ink, 700);
    ctx.strokeStyle = p.ink; ctx.globalAlpha = .23; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(76, 210); ctx.lineTo(1524, 210); ctx.stroke(); ctx.globalAlpha = 1;
    avatar(p, values.theme);
    const radius = values.theme === 'pixel' ? 0 : values.theme === 'pop' ? 46 : 30;
    ctx.save(); ctx.shadowColor = '#161e3612'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    panel(440, 250, 1084, 495, p.panel, radius, values.theme === 'pixel' ? '#7e9c86' : '#ffffff80'); ctx.restore();
    if (values.theme === 'kawaii' || values.theme === 'y3k' || values.theme === 'holo') {
      ctx.save(); roundRect(440, 250, 1084, 495, radius); ctx.clip();
      ctx.fillStyle = linear([[0, '#ffffff38'], [.5, '#ffffff00'], [1, '#ffffff00']], 440, 250, 1100, 745); ctx.fillRect(440, 250, 1084, 495); ctx.restore();
    }
    if (values.status) {
      ctx.font = `600 23px ${FONT}`;
      const pillWidth = ctx.measureText(values.status).width + 59;
      panel(482, 286, pillWidth, 43, p.soft, 22, 'transparent');
      ctx.fillStyle = p.accent; ctx.beginPath(); ctx.arc(501, 308, 4, 0, Math.PI * 2); ctx.fill();
      ctx.textBaseline = 'middle'; ctx.fillText(values.status, 516, 307); ctx.textBaseline = 'top';
    }
    fitted(values.name || 'あなたのお名前', 480, 355, 992, 2, 73, 29, p.ink, 800, 1.22);
    if (values.title) fitted(values.title, 484, 552, 980, 1, 27, 23, p.accent, 600);
    ctx.fillStyle = p.muted; ctx.font = `600 20px ${FONT}`; ctx.fillText('すきなもの', 484, 609);
    fitted(values.likes || '雑談 / ゲーム / すきなこと', 484, 647, 986, 2, 29, 20, p.ink, 500, 1.5);
    panel(76, 805, 1448, 112, p.panel, values.theme === 'pixel' ? 0 : 23);
    ctx.fillStyle = p.muted; ctx.font = `600 22px ${FONT}`; ctx.fillText('ひとこと', 108, 841);
    fitted(values.message || 'はじめまして。よろしくね。', 290, 830, 1190, 2, 29, 20, p.ink, 500, 1.4);
    fitted(config.communityCaption, 79, 950, 780, 1, 20, 16, p.ink, 500);
    ctx.font = `600 17px ${MONO}`; ctx.fillStyle = p.ink; ctx.textAlign = 'right'; ctx.fillText(p.label, 1520, 952); ctx.textAlign = 'left';
    $('style-caption').textContent = p.label;
    $('card-summary').textContent = `${config.communityName}の会員証。名前：${values.name || '未入力'}。肩書き：${values.title || 'なし'}。すきなもの：${values.likes || '未入力'}。ひとこと：${values.message || '未入力'}。参加スタイル：${values.status || '表示なし'}。デザイン：${p.label}。`;
    validate();
  }

  function scheduleRender() { if (!state.frame) state.frame = requestAnimationFrame(render); }
  $('card-form').addEventListener('submit', (event) => { event.preventDefault(); validate(true); });
  $('card-form').addEventListener('input', scheduleRender);
  $('card-form').addEventListener('change', scheduleRender);
  $('member-name').addEventListener('blur', () => validate(true));

  function resetCrop() {
    state.zoom = 1; state.x = 0; state.y = 0;
    $('avatar-zoom').value = '100'; $('avatar-x').value = '0'; $('avatar-y').value = '0';
    $('zoom-value').value = '100%'; $('x-value').value = '中央'; $('y-value').value = '中央';
  }
  ['avatar-zoom', 'avatar-x', 'avatar-y'].forEach((id) => $(id).addEventListener('input', () => {
    state.zoom = Number($('avatar-zoom').value) / 100;
    state.x = Number($('avatar-x').value); state.y = Number($('avatar-y').value);
    $('zoom-value').value = `${Math.round(state.zoom * 100)}%`;
    $('x-value').value = state.x === 0 ? '中央' : state.x < 0 ? `左 ${Math.abs(state.x)}` : `右 ${state.x}`;
    $('y-value').value = state.y === 0 ? '中央' : state.y < 0 ? `上 ${Math.abs(state.y)}` : `下 ${state.y}`;
    scheduleRender();
  }));
  $('center-avatar').addEventListener('click', () => { resetCrop(); scheduleRender(); });
  $('remove-avatar').addEventListener('click', () => {
    state.imageRequest++; state.avatar = null; state.loading = false; resetCrop();
    $('avatar-file').value = ''; $('crop-controls').hidden = true;
    $('upload-label').textContent = '端末から画像を選ぶ';
    $('avatar-error').hidden = true; $('avatar-file').removeAttribute('aria-invalid');
    $('avatar-file').focus(); scheduleRender();
  });

  function setImageError(message) {
    $('avatar-error').textContent = message; $('avatar-error').hidden = false;
    $('avatar-file').setAttribute('aria-invalid', 'true');
  }
  async function loadFile(file) {
    const requestId = ++state.imageRequest;
    state.loading = false;
    if (!file) { validate(); return; }
    $('avatar-error').hidden = true; $('avatar-file').removeAttribute('aria-invalid');
    if (file.size > 12 * 1024 * 1024) { setImageError('12MB以下の画像を選んでください。'); $('avatar-file').value = ''; validate(); return; }
    state.loading = true; validate();
    let image = null; let objectUrl = null;
    try {
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!png && !jpeg && !webp) throw new Error('format');
      if (typeof createImageBitmap === 'function') image = await createImageBitmap(file, { imageOrientation: 'from-image' });
      else { objectUrl = URL.createObjectURL(file); image = new Image(); image.src = objectUrl; await image.decode(); }
      if (!image.width || !image.height || image.width * image.height > 40_000_000) throw new Error('dimensions');
      if (requestId !== state.imageRequest) return;
      const imageCanvas = document.createElement('canvas');
      const ratio = Math.min(1, 2048 / Math.max(image.width, image.height));
      imageCanvas.width = Math.max(1, Math.round(image.width * ratio)); imageCanvas.height = Math.max(1, Math.round(image.height * ratio));
      imageCanvas.getContext('2d').drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
      state.avatar = imageCanvas; resetCrop(); $('crop-controls').hidden = false;
      $('upload-label').textContent = '別の画像に変える';
      $('save-status').textContent = 'アイコンを読み込みました。位置や大きさを調整できます。';
    } catch (error) {
      if (requestId === state.imageRequest) setImageError(error.message === 'dimensions'
        ? '画像が大きすぎます。4000万画素以下に縮小して選び直してください。'
        : '画像を読み込めませんでした。PNG・JPEG・WebPの画像を選んでください。');
    } finally {
      if (image && typeof image.close === 'function') image.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (requestId === state.imageRequest) { state.loading = false; $('avatar-file').value = ''; scheduleRender(); }
    }
  }
  $('avatar-file').addEventListener('change', (event) => loadFile(event.target.files[0]));

  function makeBlob() {
    // Flush any pending preview so an immediate Save includes the last edit.
    if (state.frame) cancelAnimationFrame(state.frame);
    render();
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('画像を作成できませんでした。')), 'image/png'));
  }
  function filename() {
    const name = getValues().name.replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '_').replace(/[. ]+$/gu, '').slice(0, 48);
    return `${config.filePrefix}-${name || 'member'}-${getValues().theme}.png`;
  }
  async function exportImage(mode) {
    if (!validate(true) || state.loading || state.saving) return;
    state.saving = true; validate(); $('save-status').textContent = '';
    try {
      const blob = await makeBlob();
      if (mode === 'download') {
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = filename(); document.body.append(link); link.click(); link.remove();
        // Keep the URL alive for mobile browsers that start the download later.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        $('save-status').textContent = 'ダウンロードを開始しました。保存できない場合は「画像を表示」をお試しください。';
      } else {
        if (state.finishedUrl) URL.revokeObjectURL(state.finishedUrl);
        state.finishedUrl = URL.createObjectURL(blob);
        $('finished-image').src = state.finishedUrl;
        $('finished-image').alt = `${config.communityName}・${getValues().name}さんの会員証。`;
        $('image-dialog').showModal();
      }
    } catch {
      $('save-status').textContent = '画像を作成できませんでした。ページを開き直してお試しください。';
    } finally { state.saving = false; validate(); }
  }
  $('download-button').addEventListener('click', () => exportImage('download'));
  $('show-button').addEventListener('click', () => exportImage('show'));
  $('close-dialog').addEventListener('click', () => $('image-dialog').close());
  render();
  if (document.fonts) document.fonts.ready.then(scheduleRender);
})();
