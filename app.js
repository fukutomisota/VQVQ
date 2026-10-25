(() => {
  'use strict';

  const config = window.CARD_CONFIG;
  const $ = (id) => document.getElementById(id);
  const canvas = $('card-canvas');
  const ctx = canvas.getContext('2d');
  const WIDTH = window.TACTILE_TOKENS.card.width;
  const HEIGHT = window.TACTILE_TOKENS.card.height;
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null;
  const characters = (text) => segmenter
    ? Array.from(segmenter.segment(text), (item) => item.segment) : Array.from(text);
  const clean = (text) => text.normalize('NFC').replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim();
  const themes = window.TACTILE_TOKENS.styles;
  const tokens = window.TACTILE_TOKENS;
  const state = { avatar: null, zoom: 1, x: 0, y: 0, frame: 0, imageRequest: 0, loading: false, saving: false, finishedUrl: null };
  const fields = [
    { id: 'member-name', error: 'name-error', max: 32, label: 'お名前', required: true },
    { id: 'member-title', error: 'title-error', max: 18, label: '肩書き' },
    { id: 'member-likes', error: 'likes-error', max: 48, label: 'すきなもの' },
    { id: 'member-message', error: 'message-error', max: 60, label: 'ひとこと' },
  ];
  const STORAGE_KEY = 'publick-world.card.v1';

  document.querySelectorAll('[data-community-name]').forEach((element) => { element.textContent = config.communityName; });
  document.title = `会員証をつくる | ${config.communityName}`;
  // Navigation sends no card content. A new tab keeps the draft available.
  try {
    const invite = new URL(config.discordInviteUrl);
    if (invite.protocol === 'https:' && ['discord.gg', 'discord.com'].includes(invite.hostname)) {
      document.querySelectorAll('[data-discord-link]').forEach(link => {
        link.href = invite.href;
        link.hidden = false;
      });
    }
  } catch { /* The generator remains usable if the invite is not configured. */ }
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  function getValues() {
    return {
      name: clean($('member-name').value), title: clean($('member-title').value),
      likes: clean($('member-likes').value), message: clean($('member-message').value),
      avatar: state.avatar, zoom: state.zoom, x: state.x, y: state.y, issuedDate,
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
    $('copy-intro').disabled = !valid;
    $('save-hint').textContent = state.loading ? 'アイコンを読み込んでいます。'
      : state.saving ? '画像を準備しています。'
      : valid ? '保存できないときは「画像を表示」から長押しで保存。'
      : clean($('member-name').value) ? '入力欄の文字数をご確認ください。' : 'お名前を入れると保存できます。';
    return valid;
  }


  const issuedDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-', '.');
  const thumbnails = [];
  const rail = $('style-rail');
  Object.entries(themes).forEach(([key, theme], index) => {
    const label = document.createElement('label'); label.className = 'theme-choice';
    const input = document.createElement('input');input.type='radio';input.name='theme';input.value=key;input.checked=index===0;input.setAttribute('form','card-form');
    const mini=document.createElement('canvas');mini.className='style-mini';mini.width=320;mini.height=200;mini.setAttribute('aria-hidden','true');
    const title=document.createElement('strong');title.className='style-mini-title';title.textContent=theme.label;
    const caption=document.createElement('span');caption.className='style-mini-caption';caption.textContent=theme.subtitle;
    label.append(input,mini,title,caption);rail.append(label);thumbnails.push({key,ctx:mini.getContext('2d')});
  });

  function rememberMessage(message) {
    $('return-message').textContent = message;
    $('return-message').hidden = !message;
  }
  function persistDetails() {
    if (!$('remember-details').checked) return;
    const values=getValues();
    const savedFields=Object.fromEntries(fields.map(field => [field.id,characters(clean($(field.id).value)).slice(0,field.max).join('')]));
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,fields:savedFields,status:values.status,theme:values.theme}));
      $('forget-details').hidden=false;
    } catch {
      $('remember-details').checked=false;
      rememberMessage('このブラウザでは入力を保存できません。そのまま会員証はつくれます。');
    }
  }
  function restoreDetails() {
    try {
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return;
      if(raw.length>4096)throw new Error('invalid saved details');
      const saved=JSON.parse(raw);
      if(saved.version!==1||!saved.fields||typeof saved.fields!=='object')throw new Error('invalid saved details');
      const values=fields.map(field=>{
        const value=saved.fields[field.id];
        if(typeof value!=='string'||characters(value).length>field.max)throw new Error('invalid saved field');
        return [field.id,clean(value)];
      });
      const status=[...$('member-status').options].find(option=>option.value===saved.status);
      // Previous local drafts can keep their closest surviving style.
      const aliases={y3k:'y3k-liquid',kawaii:'sticker-bomb',chrome:'type-poster',holo:'holo-idol',pixel:'setting-sheet'};
      const theme=themes[saved.theme]?saved.theme:aliases[saved.theme];
      values.forEach(([id,value])=>{$(id).value=value;});
      if(status)$('member-status').value=status.value;
      if(theme&&themes[theme])document.querySelector(`input[name="theme"][value="${theme}"]`).checked=true;
      $('remember-details').checked=true;
      $('forget-details').hidden=false;
      rememberMessage(values[0][1]?`おかえり、${values[0][1]}さん。`:'前回の入力を読み込みました。');
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage can be unavailable. */ }
    }
  }
  function forgetDetails() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      $('remember-details').checked=false;
      $('forget-details').hidden=true;
      rememberMessage('保存した入力内容を削除しました。');
    } catch {
      $('remember-details').checked=true;
      rememberMessage('保存した内容を削除できませんでした。ブラウザのサイトデータから削除できます。');
    }
  }
  $('remember-details').addEventListener('change',()=>{
    if($('remember-details').checked){persistDetails();if($('remember-details').checked)rememberMessage('この端末に入力内容を覚えました。');}
    else forgetDetails();
  });
  $('forget-details').addEventListener('click',forgetDetails);
  restoreDetails();

  function render() {
    state.frame=0;
    const values=getValues();const theme=themes[values.theme];
    window.TACTILE_RENDERER.draw(ctx,values.theme,values);
    for(const mini of thumbnails)window.TACTILE_RENDERER.draw(mini.ctx,mini.key,values);
    $('style-caption').textContent=theme.label;
    $('card-summary').textContent=`${config.communityName}の会員証。名前：${values.name||'未入力'}。肩書き：${values.title||'なし'}。すきなもの：${values.likes||'未入力'}。ひとこと：${values.message||'未入力'}。参加スタイル：${values.status||'表示なし'}。スタイル：${theme.label}。`;
    validate();
  }
  rail.addEventListener('change',event=>{
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const holder=$('card-holder');holder.classList.remove('style-transition','issue-reveal');
    render();persistDetails();resetCardMotion();
    if(!reduced){void holder.offsetWidth;holder.classList.add('style-transition');}
    const choice=event.target.closest('.theme-choice');
    if(choice)rail.scrollTo({left:choice.offsetLeft-rail.offsetLeft-(rail.clientWidth-choice.offsetWidth)/2,behavior:reduced?'instant':'smooth'});
  });
  const holder=$('card-holder');
  holder.addEventListener('animationend',event=>{if(event.target===holder)holder.classList.remove('style-transition','issue-reveal');});
  function resetCardMotion(){
    delete holder.dataset.interactive;delete holder.dataset.pressed;
    ['--shine-x','--shine-y','--rotate-x','--rotate-y'].forEach(key=>holder.style.removeProperty(key));
  }
  function moveCard(event){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const theme=getValues().theme;
    if(!['y3k-liquid','holo-idol','glass'].includes(theme))return;
    const rect=holder.getBoundingClientRect();
    const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    const y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
    holder.style.setProperty('--shine-x',`${x*100}%`);holder.style.setProperty('--shine-y',`${y*100}%`);
    holder.style.setProperty('--rotate-x',`${(0.5-y)*4}deg`);holder.style.setProperty('--rotate-y',`${(x-0.5)*4}deg`);
    holder.dataset.interactive='true';
  }
  holder.addEventListener('pointermove',moveCard);
  holder.addEventListener('pointerdown',event=>{holder.dataset.pressed='true';moveCard(event);});
  ['pointerup','pointercancel','pointerleave'].forEach(type=>holder.addEventListener(type,resetCardMotion));
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{
    if(event.matches){resetCardMotion();holder.classList.remove('issue-reveal','style-transition');}
  });
  let issueTimer=0;
  function revealCard(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    clearTimeout(issueTimer);holder.classList.remove('issue-reveal','style-transition');
    void holder.offsetWidth;holder.classList.add('issue-reveal');
    issueTimer=setTimeout(()=>holder.classList.remove('issue-reveal'),tokens.motion.issue||650);
  }
  function updateSticky() {
    const focused=document.activeElement;const mobile=innerWidth<=760;
    const viewportHeight=window.visualViewport?.height||innerHeight;
    document.body.classList.toggle('compact-preview',mobile&&viewportHeight<600&&focused?.matches('input[type="text"],textarea,select'));
    const previewHeight=mobile?document.querySelector('.preview-panel').getBoundingClientRect().height:tokens.space.xl;
    document.documentElement.style.setProperty('--preview-height',`${previewHeight}px`);
    document.documentElement.style.setProperty('--dock-height',`${document.querySelector('.save-actions').getBoundingClientRect().height}px`);
  }
  function keepFocusVisible(){
    updateSticky();const focused=document.activeElement;
    if(!focused||!$('editor').contains(focused))return;
    const rect=focused.getBoundingClientRect();const top=innerWidth<=760?document.querySelector('.preview-panel').getBoundingClientRect().bottom+tokens.space.md:tokens.space.xl;
    const bottom=Math.min(innerHeight,window.visualViewport?.height||innerHeight)-document.querySelector('.save-actions').getBoundingClientRect().height-tokens.space.md;
    if(rect.top<top)scrollBy(0,rect.top-top);else if(rect.bottom>bottom)scrollBy(0,rect.bottom-bottom);
  }
  new ResizeObserver(updateSticky).observe(document.querySelector('.preview-panel'));
  new ResizeObserver(updateSticky).observe(document.querySelector('.save-actions'));
  document.addEventListener('focusin',()=>requestAnimationFrame(keepFocusVisible));
  document.addEventListener('focusout',()=>requestAnimationFrame(updateSticky));
  window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(keepFocusVisible));
  addEventListener('resize',updateSticky);
  function scheduleRender() { if (!state.frame) state.frame = requestAnimationFrame(render); }
  $('card-form').addEventListener('submit', (event) => { event.preventDefault(); validate(true); });
  $('card-form').addEventListener('input', ()=>{scheduleRender();persistDetails();});
  $('card-form').addEventListener('change', event => { if(event.target.name !== 'theme') scheduleRender(); });
  $('member-name').addEventListener('blur', () => validate(true));

  function introduction(){
    const values=getValues();
    return [['名前',values.name],['肩書き',values.title],['すきなもの',values.likes],['ひとこと',values.message]]
      .filter(([,value])=>value).map(([label,value])=>`${label}：${value}`).join('\n');
  }
  $('copy-intro').addEventListener('click',async()=>{
    if(!validate(true))return;
    const text=introduction();$('copy-status').textContent='';
    try {
      if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      $('intro-copy-fallback').hidden=true;
      $('copy-status').textContent='コピーしました。Discordの自己紹介に貼り付けられます。';
    } catch {
      const fallback=$('intro-copy-fallback');fallback.value=text;fallback.hidden=false;
      fallback.focus();fallback.select();
      $('copy-status').textContent='下の文章を選んでコピーしてください。';
    }
  });

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
    $('save-status').textContent = 'アイコンを外しました。';
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
        revealCard();
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = filename(); document.body.append(link); link.click(); link.remove();
        // Keep the URL alive for mobile browsers that start the download later.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        $('save-status').textContent = '完成しました。あなたの会員証です。';
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
  render(); updateSticky();
  if (document.fonts) document.fonts.ready.then(scheduleRender);
})();
