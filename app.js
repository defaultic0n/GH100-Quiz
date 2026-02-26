/* GH-100 Flashcards PWA (Multi-deck) */
const $ = (id) => document.getElementById(id);

function applyMobileIconButtons() {
  const flip = document.getElementById('btnFlip');
  const submit = document.getElementById('btnSubmit');
  const isMobile = window.innerWidth <= 420;
  if (!flip || !submit) return;

  // preserve original desktop labels
  if (!flip.dataset.desktopText) flip.dataset.desktopText = flip.textContent || 'Flip';

  if (isMobile) {
    flip.textContent = '👁';
    submit.textContent = '✅';
    flip.setAttribute('aria-label', 'Reveal');
    submit.setAttribute('aria-label', 'Submit');
  } else {
    // do not force text here; other logic may set Flip/Reveal based on mode
    submit.textContent = 'Submit';
    flip.removeAttribute('aria-label');
    submit.removeAttribute('aria-label');
  }
}
window.addEventListener('resize', applyMobileIconButtons);

const state = {
  decksMeta: null,
  deckId: null,
  deckName: '',
  all: [],
  view: [],
  idx: 0,
  flipped: false,
  onlyMissed: false,
  shuffleQuestions: false,
  shuffleAnswers: false,
  quizMode: false,
  search: '',
  progress: {},
  selected: new Set(),
  checked: false,
  optionOrder: {},
  lastCardId: null,
};

const STORAGE_KEY = 'gh100_flashcards_progress_v2';
const PREF_KEY = 'gh100_flashcards_prefs_v_multideck';

function progressKey(cardId){ return `${state.deckId}:${cardId}`; }

function loadProgress(){
  try{ state.progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }catch{ state.progress = {}; }
}
function saveProgress(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }

function loadPrefs(){
  try{
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    state.onlyMissed = !!p.onlyMissed;
    state.shuffleQuestions = !!p.shuffleQuestions;
    state.shuffleAnswers = !!p.shuffleAnswers;
    state.quizMode = !!p.quizMode;
    state.deckId = p.deckId || null;
  }catch{}
  $('toggleMissed').checked = state.onlyMissed;
  $('toggleShuffle').checked = state.shuffleQuestions;
  $('toggleShuffleAnswers').checked = state.shuffleAnswers;
  $('toggleQuiz').checked = state.quizMode;
}
function savePrefs(){
  localStorage.setItem(PREF_KEY, JSON.stringify({
    onlyMissed: state.onlyMissed,
    shuffleQuestions: state.shuffleQuestions,
    shuffleAnswers: state.shuffleAnswers,
    quizMode: state.quizMode,
    deckId: state.deckId
  }));
}

function tallyForCurrentDeck(){
  let correct = 0, wrong = 0;
  const prefix = `${state.deckId}:`;
  for(const [k,v] of Object.entries(state.progress)){
    if(!k.startsWith(prefix)) continue;
    correct += (v.correct||0);
    wrong += (v.wrong||0);
  }
  return {correct, wrong};
}

function escapeHtml(s){
  return (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

function setFeedback(html){
  const fb = $('feedback');
  fb.innerHTML = html ? `<div class="msg">${html}</div>` : '';
}

function setFlipped(on){
  state.flipped = on;
  const el = $('card');
  if(on) el.classList.add('flipped');
  else el.classList.remove('flipped');
}

function clearInteraction(){
  state.selected = new Set();
  state.checked = false;
  setFeedback('');
  setFlipped(false);
}

function fisherYates(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function maybeReshuffleForCard(card){
  if(!card || !state.shuffleAnswers) return;
  if(state.lastCardId !== card.id){
    state.optionOrder[card.id] = null;
    state.lastCardId = card.id;
  }
}

function getDisplayOptions(card){
  if(!state.shuffleAnswers) return card.options || [];
  if(!state.optionOrder[card.id]){
    const opts = (card.options||[]).map(o => ({...o}));
    fisherYates(opts);
    state.optionOrder[card.id] = opts;
  }
  return state.optionOrder[card.id];
}

function correctDisplayIndices(card){
  const opts = getDisplayOptions(card);
  const idxs = [];
  opts.forEach((o,i)=>{ if(o.isCorrect) idxs.push(i); });
  return idxs;
}

function requiredCount(card){
  const ci = correctDisplayIndices(card);
  if(ci.length) return ci.length;
  if((card.answers||[]).length) return card.answers.length;
  return 1;
}

function formatFrontFlashcard(card){
  const opts = getDisplayOptions(card);
  const options = opts.map(o => `<li>${escapeHtml(o.text)}</li>`).join('');
  return `
    <div class="badge">Q</div>
    <h2>${escapeHtml(card.question)}</h2>
    <ul>${options}</ul>
    <div class="muted">Tap Flip to reveal answer(s).</div>
  `;
}

function formatFrontQuiz(card){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const opts = getDisplayOptions(card);
  const need = requiredCount(card);
  const hint = need > 1 ? `Select ${need} option(s), then Submit.` : `Tap an option to answer.`;

  const btns = opts.map((o,i)=>{
    const selected = state.selected.has(i) ? 'selected' : '';
    let verdict = '';
    if(state.checked){
      const correct = correctDisplayIndices(card);
      if(correct.includes(i)) verdict = 'correct';
      else if(state.selected.has(i)) verdict = 'wrong';
    }
    const disabled = state.checked ? 'disabled' : '';
    return `
      <button class="optionbtn ${selected} ${verdict}" data-idx="${i}" ${disabled}>
        <span class="letter">${letters[i]||'?'} </span>
        <span class="txt">${escapeHtml(o.text)}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="badge">Quiz</div>
    <h2>${escapeHtml(card.question)}</h2>
    <div class="muted">${escapeHtml(hint)}</div>
    <div class="quizoptions">${btns}</div>
  `;
}

function formatBack(card){
  const answers = (card.answers||[]).map(a => `<li><strong>${escapeHtml(a)}</strong></li>`).join('');
  const expl = card.explanation ? `<div class="muted">${escapeHtml(card.explanation)}</div>` : `<div class="muted">No explanation provided.</div>`;
  return `
    <div class="badge">A</div>
    <h2>Correct answer(s)</h2>
    <ul>${answers}</ul>
    ${expl}
  `;
}

function updateButtonsForMode(){
  const flip = $('btnFlip');
  const submit = $('btnSubmit');
  const marking = document.querySelector('.marking');

  if(state.quizMode){
    submit.style.display = 'inline-block';
    // desktop label; mobile will be overridden by icons
    if(window.innerWidth > 420) flip.textContent = 'Reveal';
    flip.disabled = !state.checked;
    if(marking) marking.style.display = 'none';
  } else {
    submit.style.display = 'none';
    if(window.innerWidth > 420) flip.textContent = 'Flip';
    flip.disabled = false;
    if(marking) marking.style.display = 'flex';
  }
  applyMobileIconButtons();
}

function render(){
  const total = state.view.length;
  const card = state.view[state.idx];
  $('statDeck').textContent = state.deckName || 'Deck';
  $('statIndex').textContent = total ? `${state.idx+1}/${total}` : '0/0';
  const t = tallyForCurrentDeck();
  $('statScore').textContent = `${t.correct} correct • ${t.wrong} missed`;

  updateButtonsForMode();

  if(!total){
    $('front').innerHTML = `<h2>No cards match your filters.</h2><div class="muted">Try turning off “Only missed” or clearing search.</div>`;
    $('back').innerHTML = `<h2>—</h2>`;
    setFeedback('');
    setFlipped(false);
    return;
  }

  maybeReshuffleForCard(card);
  $('front').innerHTML = state.quizMode ? formatFrontQuiz(card) : formatFrontFlashcard(card);
  $('back').innerHTML = formatBack(card);
  setFlipped(false);

  if(state.quizMode){
    const need = requiredCount(card);
    document.querySelectorAll('.optionbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.idx);
        if(Number.isNaN(i) || state.checked) return;
        if(need === 1){
          state.selected = new Set([i]);
          submitQuiz();
          return;
        }
        if(state.selected.has(i)) state.selected.delete(i);
        else {
          if(state.selected.size >= need){
            const first = state.selected.values().next().value;
            state.selected.delete(first);
          }
          state.selected.add(i);
        }
        render();
      });
    });
  }
}

function applyFilters(){
  const q = state.search.trim().toLowerCase();
  let cards = [...state.all];
  if(state.onlyMissed){
    cards = cards.filter(c => (state.progress[progressKey(c.id)]?.wrong || 0) > 0);
  }
  if(q){
    cards = cards.filter(c => {
      const front = (c.question + ' ' + (c.options||[]).map(o=>o.text).join(' ')).toLowerCase();
      const back = ((c.answers||[]).join(' ') + ' ' + (c.explanation||'')).toLowerCase();
      return front.includes(q) || back.includes(q);
    });
  }
  if(state.shuffleQuestions) fisherYates(cards);
  state.view = cards;
  if(state.idx >= state.view.length) state.idx = 0;
  clearInteraction();
  state.optionOrder = {};
  state.lastCardId = null;
  render();
}

function next(){
  if(state.view.length===0) return;
  state.idx = (state.idx + 1) % state.view.length;
  clearInteraction();
  render();
}
function prev(){
  if(state.view.length===0) return;
  state.idx = (state.idx - 1 + state.view.length) % state.view.length;
  clearInteraction();
  render();
}

function mark(kind){
  const card = state.view[state.idx];
  if(!card) return;
  const k = progressKey(card.id);
  state.progress[k] = state.progress[k] || {correct:0, wrong:0};
  state.progress[k][kind] = (state.progress[k][kind]||0) + 1;
  saveProgress();
  if(state.onlyMissed) applyFilters();
  else next();
}

function resetProgress(){
  const prefix = `${state.deckId}:`;
  for(const k of Object.keys(state.progress)){
    if(k.startsWith(prefix)) delete state.progress[k];
  }
  saveProgress();
  applyFilters();
}

function setsEqual(a,b){
  if(a.size !== b.size) return false;
  for(const v of a) if(!b.has(v)) return false;
  return true;
}

function submitQuiz(){
  const card = state.view[state.idx];
  if(!card) return;
  const need = requiredCount(card);
  if(state.selected.size !== need){
    setFeedback(`<strong>Pick ${need}</strong> option(s) before submitting.`);
    return;
  }
  const correct = new Set(correctDisplayIndices(card));
  const ok = setsEqual(new Set([...state.selected]), correct);
  state.checked = true;

  const k = progressKey(card.id);
  state.progress[k] = state.progress[k] || {correct:0, wrong:0};
  if(ok) state.progress[k].correct = (state.progress[k].correct||0) + 1;
  else state.progress[k].wrong = (state.progress[k].wrong||0) + 1;
  saveProgress();

  const answers = (card.answers||[]).map(a=>escapeHtml(a)).join('<br/>');
  if(ok){
    setFeedback(`<strong>Correct ✅</strong>`);
  } else {
    setFeedback(`<strong>Incorrect ❌</strong><div class="hint" style="margin-top:6px">Correct answer(s):<br/>${answers || '—'}</div>`);
  }
  updateButtonsForMode();
  render();
}

function showUpdateBanner(reg){
  const banner = $('updateBanner');
  const btn = $('btnUpdate');
  if(!banner || !btn) return;
  banner.classList.remove('hidden');
  btn.onclick = () => {
    if(reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  };
}

function setupServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    if(reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if(!nw) return;
      nw.addEventListener('statechange', () => {
        if(nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(reg);
      });
    });
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
}

async function loadDecksMeta(){
  const meta = await (await fetch('decks.json')).json();
  state.decksMeta = meta;
  if(!state.deckId) state.deckId = meta.defaultDeckId || meta.decks?.[0]?.id || 'base';

  const sel = $('deckSelect');
  sel.innerHTML = '';
  (meta.decks || []).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
  sel.value = state.deckId;
  sel.addEventListener('change', async (e)=>{ await switchDeck(e.target.value); });
}

async function switchDeck(deckId){
  state.deckId = deckId;
  savePrefs();
  const d = (state.decksMeta.decks || []).find(x => x.id === deckId);
  state.deckName = d?.name || 'Deck';
  const deckData = await (await fetch(d.file)).json();
  state.all = deckData.cards || [];
  state.idx = 0;
  state.search = '';
  $('searchBox').value = '';
  applyFilters();
}

async function boot(){
  loadProgress();
  loadPrefs();
  await loadDecksMeta();
  await switchDeck(state.deckId);

  $('btnNext').addEventListener('click', next);
  $('btnPrev').addEventListener('click', prev);
  $('btnFlip').addEventListener('click', () => setFlipped(!state.flipped));
  $('btnSubmit').addEventListener('click', submitQuiz);

  $('btnCorrect').addEventListener('click', () => mark('correct'));
  $('btnWrong').addEventListener('click', () => mark('wrong'));

  $('toggleShuffle').addEventListener('change', (e)=>{ state.shuffleQuestions = e.target.checked; savePrefs(); applyFilters(); });
  $('toggleShuffleAnswers').addEventListener('change', (e)=>{
    state.shuffleAnswers = e.target.checked;
    state.optionOrder = {};
    state.lastCardId = null;
    savePrefs();
    clearInteraction();
    render();
  });
  $('toggleMissed').addEventListener('change', (e)=>{ state.onlyMissed = e.target.checked; savePrefs(); applyFilters(); });
  $('toggleQuiz').addEventListener('change', (e)=>{ state.quizMode = e.target.checked; savePrefs(); clearInteraction(); render(); });

  $('btnReset').addEventListener('click', resetProgress);
  $('searchBox').addEventListener('input', (e)=>{ state.search = e.target.value; applyFilters(); });
  $('btnClearSearch').addEventListener('click', ()=>{ $('searchBox').value=''; state.search=''; applyFilters(); });

  window.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowRight') next();
    if(e.key==='ArrowLeft') prev();
    if(e.key==='Enter' && state.quizMode) submitQuiz();
    if(e.key===' ') { e.preventDefault(); if(!state.quizMode) setFlipped(!state.flipped); }
  });

  applyMobileIconButtons();
  setupServiceWorker();
}

boot();
