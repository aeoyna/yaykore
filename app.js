/* ============================
   SwipeCard App - app.js
   ============================ */

// ============================================================
// DATA LAYER
// ============================================================

const STORAGE_KEY = 'swipecard_decks';
const EMOJIS = ['📚','🌍','🎵','🔬','🍎','✈️','🎓','💡','🏆','🌸','🎯','🧠','📝','🦊','🌊','🏠','🎭','🔥','💎','🚀'];

const SAMPLE_DECKS = [
  {
    id: 'deck_sample1',
    name: 'TOEIC 基本単語',
    emoji: '📚',
    createdAt: Date.now() - 86400000,
    learned: [],
    cards: [
      { id: 'c1', front: 'Accomplish', back: '達成する・成し遂げる', phonetic: '/əˈkɒmplɪʃ/', example: 'We accomplished our goal.' },
      { id: 'c2', front: 'Adjacent', back: '隣接した・近くの', phonetic: '/əˈdʒeɪsənt/', example: 'The office is adjacent to the park.' },
      { id: 'c3', front: 'Allocate', back: '割り当てる・配分する', phonetic: '/ˈæləkeɪt/', example: 'We need to allocate resources.' },
      { id: 'c4', front: 'Ambitious', back: '野心的な・意欲的な', phonetic: '/æmˈbɪʃəs/', example: 'She is an ambitious manager.' },
      { id: 'c5', front: 'Analyze', back: '分析する・解析する', phonetic: '/ˈænəlaɪz/', example: 'Please analyze the data.' },
      { id: 'c6', front: 'Beneficial', back: '有益な・ためになる', phonetic: '/ˌbenɪˈfɪʃəl/', example: 'Exercise is beneficial to health.' },
      { id: 'c7', front: 'Collaborate', back: '協力する・共同作業する', phonetic: '/kəˈlæbəreɪt/', example: 'They collaborated on the project.' },
      { id: 'c8', front: 'Demonstrate', back: 'デモする・示す', phonetic: '/ˈdemənstreɪt/', example: 'Please demonstrate the product.' },
      { id: 'c9', front: 'Efficient', back: '効率的な', phonetic: '/ɪˈfɪʃənt/', example: 'The process is very efficient.' },
      { id: 'c10', front: 'Evaluate', back: '評価する・査定する', phonetic: '/ɪˈvæljueɪt/', example: 'We evaluate performance quarterly.' },
    ]
  },
  {
    id: 'deck_sample2',
    name: '日常英会話',
    emoji: '🌍',
    createdAt: Date.now() - 43200000,
    learned: [],
    cards: [
      { id: 'e1', front: 'What\'s up?', back: '最近どう？', phonetic: '', example: 'Hey! What\'s up?' },
      { id: 'e2', front: 'Take it easy', back: 'のんびりしてね', phonetic: '', example: 'Take it easy this weekend.' },
      { id: 'e3', front: 'Hang out', back: '一緒に過ごす', phonetic: '', example: 'Let\'s hang out sometime.' },
      { id: 'e4', front: 'Break a leg', back: '頑張って！', phonetic: '', example: 'Break a leg at the interview!' },
      { id: 'e5', front: 'Hit the sack', back: '寝る', phonetic: '', example: 'I\'m going to hit the sack early.' },
      { id: 'e6', front: 'Under the weather', back: '体調が悪い', phonetic: '', example: 'I\'m a bit under the weather today.' },
      { id: 'e7', front: 'Spill the beans', back: '秘密を明かす', phonetic: '', example: 'Don\'t spill the beans about the party!' },
    ]
  }
];

function loadDecks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    // First load: use sample data
    saveDecks(SAMPLE_DECKS);
    return SAMPLE_DECKS;
  } catch {
    return [];
  }
}

function saveDecks(decks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

const SETTINGS_KEY = 'swipecard_settings';
const DEFAULT_SETTINGS = {
  fontSize: 'large',
  shuffle: true
};

let settings = loadSettings();

function loadSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(newSettings) {
  settings = newSettings;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error(e);
  }
  applySettings();
}

function applySettings() {
  const fontSizes = {
    standard: 'clamp(1.6rem, 5.5vw, 2.4rem)',
    large: 'clamp(2.4rem, 7.5vw, 3.4rem)',
    extra: 'clamp(3.2rem, 9.5vw, 4.4rem)'
  };
  const sizeValue = fontSizes[settings.fontSize] || fontSizes.large;
  document.documentElement.style.setProperty('--card-word-size', sizeValue);
}

applySettings();

function genId() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================================
// APP STATE
// ============================================================

let decks = loadDecks();
let currentDeck = null;
let studyQueue = []; // indices into currentDeck.cards
let studyIndex = 0;
let sessionCorrect = 0;
let sessionWrong = 0;
let wrongCards = [];
let correctCards = [];
let isFlipped = false;

// ============================================================
// PACHINKO & PARTICLES STATE
// ============================================================
const SCORE_STORAGE_KEY = 'swipecard_score';
let score = loadScore();
let isRushActive = false;
let rushTimeRemaining = 0;
let rushTimerInterval = null;
let isReelSpinning = false;

let particles = [];
let particleCanvas = null;
let particleCtx = null;
let particleAnimationId = null;

function loadScore() {
  try {
    const s = localStorage.getItem(SCORE_STORAGE_KEY);
    return s ? parseInt(s) : 0;
  } catch {
    return 0;
  }
}

function saveScore(s) {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, s);
  } catch (e) {
    console.error(e);
  }
}

// ============================================================
// METRONOME STATE
// ============================================================
let audioCtx = null;
let isMetroPlaying = false;
let metroBpm = 60;
let beatsPerMeasure = 2;
let currentBeat = 0;
let nextNoteTime = 0.0;
let lookahead = 25.0; // ms
let scheduleAheadTime = 0.1; // sec
let metroTimerId = null;

// ============================================================
// DOM HELPERS
// ============================================================

const $ = id => document.getElementById(id);

function showScreen(screenId) {
  if (screenId !== 'screen-study') {
    stopMetronome();
    pauseRush();
  } else {
    // Entering study screen: update score display and check RUSH
    const scoreValEl = $('pachinko-score-val');
    if (scoreValEl) scoreValEl.textContent = String(score).padStart(5, '0');
    
    if (isRushActive && rushTimeRemaining > 0) {
      resumeRush();
    } else {
      resetRushUI();
    }
  }
  document.querySelectorAll('.screen').forEach(s => {
    if (s.id === screenId) {
      s.classList.remove('slide-out');
      s.classList.add('active');
    } else {
      s.classList.remove('active');
      if (s.classList.contains('active')) {
        s.classList.add('slide-out');
        setTimeout(() => s.classList.remove('slide-out'), 400);
      }
    }
  });
}

function showToast(msg, duration = 2000) {
  const toast = $('toast');
  toast.classList.remove('hidden');
  toast.textContent = msg;
  requestAnimationFrame(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
  });
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}


// ============================================================
// HOME SCREEN
// ============================================================

function renderHome() {
  const list = $('deck-list');
  const countEl = $('deck-count');
  list.innerHTML = '';
  countEl.textContent = decks.length + ' デッキ';

  if (decks.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>デッキがありません</h3>
        <p>右上の「＋」ボタンを押して<br/>最初のデッキを作ろう！</p>
        <button class="btn-primary" style="max-width:200px;margin:0 auto;" onclick="openDeckModal()">デッキを作成</button>
      </div>`;
    return;
  }

  decks.forEach((deck, i) => {
    const total = deck.cards.length;
    const learned = deck.learned ? deck.learned.length : 0;
    const pct = total > 0 ? Math.round((learned / total) * 100) : 0;

    // Count due cards
    const now = Date.now();
    const dueCount = deck.cards.filter(c => !c.srs || !c.srs.nextReview || c.srs.nextReview <= now).length;
    const dueText = dueCount > 0 ? `<span class="due-badge">${dueCount} 復習</span>` : '<span class="due-clean">完了</span>';

    const card = document.createElement('div');
    card.className = 'deck-card';
    card.style.animationDelay = `${i * 60}ms`;
    card.innerHTML = `
      <div class="deck-emoji">${deck.emoji}</div>
      <div class="deck-info">
        <div class="deck-title">${escHtml(deck.name)}</div>
        <div class="deck-meta">${total} 単語 · 習得 ${pct}% · ${dueText}</div>
        <div class="deck-progress-wrap">
          <div class="deck-progress" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="deck-actions">
        <button class="deck-btn-study" data-idx="${i}">学習開始</button>
        <button class="deck-btn-edit" data-idx="${i}">編集</button>
      </div>`;

    list.appendChild(card);
  });

  // Event delegation
  list.addEventListener('click', e => {
    const studyBtn = e.target.closest('.deck-btn-study');
    const editBtn = e.target.closest('.deck-btn-edit');
    const card = e.target.closest('.deck-card');

    if (studyBtn) {
      e.stopPropagation();
      startStudy(parseInt(studyBtn.dataset.idx));
    } else if (editBtn) {
      e.stopPropagation();
      openDeckModal(parseInt(editBtn.dataset.idx));
    } else if (card) {
      const idx = [...$('deck-list').children].indexOf(card);
      startStudy(idx);
    }
  }, { once: true });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// DECK MODAL
// ============================================================

let editingDeckIdx = -1;
let selectedEmoji = EMOJIS[0];
let editorCards = [];

function openDeckModal(deckIdx = -1) {
  editingDeckIdx = deckIdx;
  const modal = $('modal-deck');
  const titleEl = $('modal-deck-title');
  const nameInput = $('deck-name-input');
  const deletBtn = $('btn-delete-deck');

  if (deckIdx >= 0) {
    const deck = decks[deckIdx];
    titleEl.textContent = 'デッキを編集';
    nameInput.value = deck.name;
    selectedEmoji = deck.emoji;
    editorCards = deck.cards.map(c => ({ ...c }));
    deletBtn.classList.remove('hidden');
  } else {
    titleEl.textContent = '新しいデッキ';
    nameInput.value = '';
    selectedEmoji = EMOJIS[0];
    editorCards = [{ id: genId(), front: '', back: '', phonetic: '', example: '' }];
    deletBtn.classList.add('hidden');
  }

  renderEmojiGrid();
  renderCardsEditor();
  modal.classList.remove('hidden');
  setTimeout(() => nameInput.focus(), 300);
}

function closeDeckModal() {
  const modal = $('modal-deck');
  modal.classList.add('hidden');
}

function renderEmojiGrid() {
  const grid = $('emoji-grid');
  grid.innerHTML = '';
  EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn' + (em === selectedEmoji ? ' selected' : '');
    btn.textContent = em;
    btn.addEventListener('click', () => {
      selectedEmoji = em;
      grid.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    grid.appendChild(btn);
  });
}

function renderCardsEditor() {
  const editor = $('cards-editor');
  editor.innerHTML = '';
  editorCards.forEach((card, i) => {
    const item = document.createElement('div');
    item.className = 'card-editor-item';
    item.innerHTML = `
      <input type="text" placeholder="表面 (例: Apple)" value="${escHtml(card.front)}" data-field="front" data-idx="${i}" />
      <input type="text" placeholder="裏面 (例: りんご)" value="${escHtml(card.back)}" data-field="back" data-idx="${i}" />
      <button class="btn-remove" data-rm="${i}" title="削除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="card-editor-phonetic">
        <input type="text" placeholder="発音記号 (任意)" value="${escHtml(card.phonetic || '')}" data-field="phonetic" data-idx="${i}" />
      </div>
      <div class="card-editor-example">
        <input type="text" placeholder="例文 (任意)" value="${escHtml(card.example || '')}" data-field="example" data-idx="${i}" />
      </div>`;
    editor.appendChild(item);
  });

  editor.addEventListener('input', e => {
    const input = e.target;
    const idx = parseInt(input.dataset.idx);
    const field = input.dataset.field;
    if (idx >= 0 && field) editorCards[idx][field] = input.value;
  });

  editor.addEventListener('click', e => {
    const rmBtn = e.target.closest('[data-rm]');
    if (rmBtn) {
      const idx = parseInt(rmBtn.dataset.rm);
      if (editorCards.length === 1) { showToast('最低1枚のカードが必要です'); return; }
      editorCards.splice(idx, 1);
      renderCardsEditor();
    }
  });
}

function saveDeck() {
  const name = $('deck-name-input').value.trim();
  if (!name) { showToast('デッキ名を入力してください'); $('deck-name-input').focus(); return; }

  const validCards = editorCards.filter(c => c.front.trim() && c.back.trim());
  if (validCards.length === 0) { showToast('有効なカードが必要です'); return; }

  // Ensure all cards have IDs
  validCards.forEach(c => { if (!c.id) c.id = genId(); });

  if (editingDeckIdx >= 0) {
    const old = decks[editingDeckIdx];
    decks[editingDeckIdx] = { ...old, name, emoji: selectedEmoji, cards: validCards };
    showToast('✅ デッキを更新しました');
  } else {
    decks.push({ id: genId(), name, emoji: selectedEmoji, createdAt: Date.now(), learned: [], cards: validCards });
    showToast('✅ デッキを作成しました');
  }

  saveDecks(decks);
  closeDeckModal();
  renderHome();
}

function deleteDeck() {
  if (editingDeckIdx < 0) return;
  if (!confirm(`「${decks[editingDeckIdx].name}」を削除しますか？`)) return;
  decks.splice(editingDeckIdx, 1);
  saveDecks(decks);
  closeDeckModal();
  renderHome();
  showToast('🗑 デッキを削除しました');
}

// ============================================================
// STUDY SCREEN
// ============================================================

function startStudy(deckIdx, wrongOnly = false) {
  currentDeck = decks[deckIdx];
  if (!currentDeck || currentDeck.cards.length === 0) {
    showToast('このデッキにカードがありません');
    return;
  }

  if (wrongOnly) {
    studyQueue = wrongCards.map(c => currentDeck.cards.indexOf(c)).filter(i => i >= 0);
  } else {
    const now = Date.now();
    const dueIndices = currentDeck.cards
      .map((c, idx) => ({ card: c, idx }))
      .filter(item => !item.card.srs || !item.card.srs.nextReview || item.card.srs.nextReview <= now)
      .map(item => item.idx);

    if (dueIndices.length > 0) {
      studyQueue = dueIndices;
      showToast(`📝 復習対象の単語 ${dueIndices.length} 枚を学習します`);
    } else {
      if (confirm('現在、復習が必要な単語はありません。すべての単語を学習しますか？')) {
        studyQueue = [...Array(currentDeck.cards.length).keys()];
      } else {
        showScreen('screen-home');
        renderHome();
        return;
      }
    }
  }

  // Shuffle
  if (settings.shuffle !== false) {
    for (let i = studyQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [studyQueue[i], studyQueue[j]] = [studyQueue[j], studyQueue[i]];
    }
  }

  studyIndex = 0;
  sessionCorrect = 0;
  sessionWrong = 0;
  wrongCards = [];
  correctCards = [];
  isFlipped = false;

  $('study-deck-name').textContent = currentDeck.emoji + ' ' + currentDeck.name;
  $('study-complete').classList.add('hidden');
  $('study-footer').style.display = '';
  $('card-stack').style.display = '';

  showScreen('screen-study');
  setTimeout(() => renderStudyCard(), 200);
}

function renderStudyCard() {
  const stack = $('card-stack');
  stack.innerHTML = '';
  isFlipped = false;

  if (studyIndex >= studyQueue.length) {
    showComplete();
    return;
  }

  updateProgress();

  // Render Background Card 2 (Bottom)
  if (studyIndex + 2 < studyQueue.length) {
    const cardNext2 = currentDeck.cards[studyQueue[studyIndex + 2]];
    const bg2 = document.createElement('div');
    bg2.className = 'flash-card-bg-2';
    bg2.innerHTML = `<div class="card-word">${escHtml(cardNext2.front)}</div>`;
    stack.appendChild(bg2);
  }

  // Render Background Card 1 (Middle)
  if (studyIndex + 1 < studyQueue.length) {
    const cardNext1 = currentDeck.cards[studyQueue[studyIndex + 1]];
    const bg1 = document.createElement('div');
    bg1.className = 'flash-card-bg-1';
    bg1.innerHTML = `<div class="card-word">${escHtml(cardNext1.front)}</div>`;
    stack.appendChild(bg1);
  }

  // Render Active Card (Top)
  const card = currentDeck.cards[studyQueue[studyIndex]];
  const el = document.createElement('div');
  el.className = 'flash-card';
  el.id = 'current-card';
  el.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-front">
        <button class="card-btn-speak" id="btn-speak-current" title="英語読み上げ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
        <div class="card-word">${escHtml(card.front)}</div>
        ${card.phonetic ? `<div class="card-phonetic">${escHtml(card.phonetic)}</div>` : ''}
        <div class="card-tap-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          </svg>
          タップしてめくる
        </div>
      </div>
      <div class="card-face card-back">
        <div class="card-word">${escHtml(card.back)}</div>
        ${card.example ? `<div class="card-example">"${escHtml(card.example)}"</div>` : ''}
      </div>
    </div>`;

  stack.appendChild(el);

  // Setup manual speaker button event handler
  const speakBtn = el.querySelector('#btn-speak-current');
  if (speakBtn) {
    const handleSpeak = e => {
      e.stopPropagation();
      e.preventDefault();
      speakText(card.front);
    };
    speakBtn.addEventListener('click', handleSpeak);
    speakBtn.addEventListener('touchstart', handleSpeak, { passive: false });
    speakBtn.addEventListener('mousedown', handleSpeak);
  }

  setupCardInteraction(el);

  // Auto pronunciation
  speakText(card.front);

  // Entrance animation
  el.style.opacity = '0';
  el.style.transform = 'scale(0.92) translateY(12px)';
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    el.style.opacity = '1';
    el.style.transform = 'scale(1) translateY(0)';
  });
}

function flipCard() {
  const el = $('current-card');
  if (!el) return;
  isFlipped = !isFlipped;
  el.classList.toggle('flipped', isFlipped);
}

function updateProgress() {
  const total = studyQueue.length;
  const done = studyIndex;
  $('progress-text').textContent = `${done}/${total}`;
  $('progress-bar').style.width = `${total > 0 ? (done / total) * 100 : 0}%`;

  // Update stat badges
  const badgeL = $('badge-learning');
  const badgeR = $('badge-correct');
  if (badgeL) badgeL.textContent = sessionWrong;
  if (badgeR) badgeR.textContent = sessionCorrect;
}

function markCard(correct) {
  const card = currentDeck.cards[studyQueue[studyIndex]];
  
  if (!card.srs) {
    card.srs = {
      lastReviewed: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: 0
    };
  }

  const now = Date.now();
  card.srs.lastReviewed = now;

  if (correct) {
    sessionCorrect++;
    correctCards.push(card);
    
    // Interval Calculation (1 min -> 5 min -> 15 min -> previous interval * easeFactor)
    let nextInterval = 0;
    if (card.srs.repetitions === 0) {
      nextInterval = 1;
    } else if (card.srs.repetitions === 1) {
      nextInterval = 5;
    } else if (card.srs.repetitions === 2) {
      nextInterval = 15;
    } else {
      nextInterval = Math.round(card.srs.interval * card.srs.easeFactor);
    }
    
    card.srs.interval = nextInterval;
    card.srs.repetitions++;
    card.srs.nextReview = now + nextInterval * 60 * 1000;
    card.srs.easeFactor = Math.min(3.0, card.srs.easeFactor + 0.1);

    if (!currentDeck.learned) currentDeck.learned = [];
    if (!currentDeck.learned.includes(card.id)) currentDeck.learned.push(card.id);
  } else {
    sessionWrong++;
    wrongCards.push(card);
    
    // Reset on fail (immediate review)
    card.srs.interval = 0;
    card.srs.repetitions = 0;
    card.srs.nextReview = now;
    card.srs.easeFactor = Math.max(1.3, card.srs.easeFactor - 0.2);

    // Remove from learned if re-marked wrong
    if (currentDeck.learned) {
      currentDeck.learned = currentDeck.learned.filter(id => id !== card.id);
    }
  }

  saveDecks(decks);
  studyIndex++;
  animateCardOut(correct, () => renderStudyCard());

  // Audio activation and gacha roll
  initAudioContext();
  checkGachaChance();
}

function animateCardOut(correct, callback) {
  const el = $('current-card');
  if (!el) { callback(); return; }

  // Spawn particle effect floating upwards from the card position
  try {
    const rect = el.getBoundingClientRect();
    const studyScreen = $('screen-study');
    if (studyScreen) {
      const studyRect = studyScreen.getBoundingClientRect();
      const canvasX = rect.left - studyRect.left + rect.width / 2;
      const canvasY = rect.top - studyRect.top + rect.height / 2;
      spawnParticles(canvasX, canvasY, correct ? '#34d399' : '#f87171');
    }
  } catch (e) {
    console.error('Failed to spawn particles:', e);
  }

  // 1. Swipe out the current card
  const dx = correct ? 120 : -120;
  const rotate = correct ? 20 : -20;

  el.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.25s ease';
  el.style.transform = `translateX(${dx}%) rotate(${rotate}deg)`;
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';

  // 2. Instantly promote background cards in the DOM to start their visual transition
  const bg1 = document.querySelector('.flash-card-bg-1');
  const bg2 = document.querySelector('.flash-card-bg-2');

  // Since studyIndex has already been incremented, the new active card is at studyIndex
  if (bg1 && studyIndex < studyQueue.length) {
    const nextCard = currentDeck.cards[studyQueue[studyIndex]];
    // Promote bg1 to active card style and position
    bg1.className = 'flash-card';
    bg1.style.transform = 'translate3d(0, 0, 10px) rotate(0deg) scale(1)';
    bg1.style.left = '0';
    bg1.style.width = '100%';
    // Set the inner structure to match the active card
    bg1.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front">
          <button class="card-btn-speak" style="opacity: 0" title="英語読み上げ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <div class="card-word">${escHtml(nextCard.front)}</div>
          ${nextCard.phonetic ? `<div class="card-phonetic">${escHtml(nextCard.phonetic)}</div>` : ''}
          <div class="card-tap-hint">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            </svg>
            タップしてめくる
          </div>
        </div>
      </div>`;
  }

  if (bg2 && studyIndex + 1 < studyQueue.length) {
    const nextNextCard = currentDeck.cards[studyQueue[studyIndex + 1]];
    // Promote bg2 to bg1 slot
    bg2.className = 'flash-card-bg-1';
    bg2.innerHTML = `<div class="card-word">${escHtml(nextNextCard.front)}</div>`;
  }

  // Create and fade-in the new bg2 card at the bottom of the stack
  if (studyIndex + 2 < studyQueue.length) {
    const futureCard = currentDeck.cards[studyQueue[studyIndex + 2]];
    const newBg2 = document.createElement('div');
    newBg2.className = 'flash-card-bg-2';
    newBg2.style.opacity = '0';
    newBg2.style.transition = 'opacity 0.25s ease';
    newBg2.innerHTML = `<div class="card-word">${escHtml(futureCard.front)}</div>`;
    
    const stack = $('card-stack');
    stack.insertBefore(newBg2, stack.firstChild);
    requestAnimationFrame(() => {
      newBg2.style.opacity = '';
    });
  }



  setTimeout(callback, 260);
}

function showComplete() {
  $('card-stack').style.display = 'none';
  $('study-footer').style.display = 'none';

  const stats = $('complete-stats');
  stats.innerHTML = `
    <div class="stat-chip total"><div class="stat-num">${studyQueue.length}</div><div class="stat-label">合計</div></div>
    <div class="stat-chip correct"><div class="stat-num">${sessionCorrect}</div><div class="stat-label">覚えた</div></div>
    <div class="stat-chip wrong"><div class="stat-num">${sessionWrong}</div><div class="stat-label">要復習</div></div>`;

  $('study-complete').classList.remove('hidden');

  const redoBtn = $('btn-redo-wrong');
  if (sessionWrong === 0) {
    redoBtn.disabled = true;
    redoBtn.style.opacity = '0.4';
  } else {
    redoBtn.disabled = false;
    redoBtn.style.opacity = '';
  }

  updateProgress();
}

// ============================================================
// SWIPE / DRAG INTERACTION
// ============================================================

function setupCardInteraction(el) {
  let startX = 0, startY = 0, currentX = 0, currentY = 0;
  let dragging = false;
  let direction = 'none';
  let hasDragged = false;

  function onStart(clientX, clientY) {
    startX = clientX;
    startY = clientY;
    currentX = 0;
    currentY = 0;
    dragging = true;
    direction = 'none';
    hasDragged = false;
    el.style.transition = 'none';
  }

  function onMove(clientX, clientY, canPreventDefault, event) {
    if (!dragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    currentX = dx;
    currentY = dy;

    // Detect if user dragged the card significantly
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      hasDragged = true;
    }

    // Detect swipe direction
    if (direction === 'none' && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      direction = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (direction === 'horizontal') {
      if (canPreventDefault && event && event.cancelable) {
        event.preventDefault();
      }
      const rotate = dx * 0.08;
      const scale = 1 - Math.min(Math.abs(dx) / 1200, 0.04);
      el.style.transform = `translateX(${dx}px) rotate(${rotate}deg) scale(${scale})`;

      // Real-time card border color/glow interpolation
      const faces = el.querySelectorAll('.card-face');
      if (dx > 0) {
        const amt = Math.min(dx / 120, 1);
        faces.forEach(f => {
          f.style.borderColor = `rgba(52, 211, 153, ${0.2 + amt * 0.6})`;
          f.style.boxShadow = `var(--shadow-card), 0 0 40px rgba(52, 211, 153, ${0.08 + amt * 0.22})`;
        });
      } else {
        const amt = Math.min(-dx / 120, 1);
        faces.forEach(f => {
          f.style.borderColor = `rgba(248, 113, 113, ${0.2 + amt * 0.6})`;
          f.style.boxShadow = `var(--shadow-card), 0 0 40px rgba(248, 113, 113, ${0.08 + amt * 0.22})`;
        });
      }


    }
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;

    const faces = el.querySelectorAll('.card-face');

    // If it was a simple tap (no drag), let the click listener handle flipping
    if (!hasDragged) {
      el.style.transition = 'transform 0.3s ease';
      el.style.transform = '';
      faces.forEach(f => {
        f.style.borderColor = '';
        f.style.boxShadow = '';
      });
      return;
    }

    if (direction === 'horizontal') {
      const threshold = 80;
      if (currentX > threshold) {
        markCard(true);
      } else if (currentX < -threshold) {
        markCard(false);
      } else {
        // Snap back
        el.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        el.style.transform = 'translateX(0) rotate(0deg) scale(1)';
        faces.forEach(f => {
          f.style.transition = 'border-color 0.4s ease, box-shadow 0.4s ease';
          f.style.borderColor = '';
          f.style.boxShadow = '';
          setTimeout(() => { f.style.transition = ''; }, 400);
        });
      }
    } else {
      // Snap back for vertical or undefined movement
      el.style.transition = 'transform 0.3s ease';
      el.style.transform = '';
      faces.forEach(f => {
        f.style.borderColor = '';
        f.style.boxShadow = '';
      });
    }
  }

  // Native click listener to handle flipping
  el.addEventListener('click', e => {
    // Prevent flip if we just finished dragging, or clicked the speaker button
    if (hasDragged) return;
    if (e.target.closest('#btn-speak-current')) return;
    flipCard();
  });

  // Touch events
  el.addEventListener('touchstart', e => {
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    const t = e.touches[0];
    onMove(t.clientX, t.clientY, true, e);
  }, { passive: false });

  el.addEventListener('touchend', onEnd);
  el.addEventListener('touchcancel', () => {
    dragging = false;
    el.style.transition = 'transform 0.3s ease';
    el.style.transform = '';
  });

  // Mouse events
  el.addEventListener('mousedown', e => {
    onStart(e.clientX, e.clientY);
    // Do not call e.preventDefault() here, to allow click event to propagate
  });

  document.addEventListener('mousemove', e => {
    if (dragging) onMove(e.clientX, e.clientY, false, e);
  });

  document.addEventListener('mouseup', () => {
    if (dragging) onEnd();
  });
}

// ============================================================
// SETTINGS MODAL
// ============================================================

function openSettingsModal() {
  const radios = document.getElementsByName('font-size-option');
  radios.forEach(radio => {
    radio.checked = radio.value === settings.fontSize;
  });
  
  $('setting-shuffle-toggle').checked = settings.shuffle !== false;
  
  $('modal-settings').classList.remove('hidden');
}

function closeSettingsModal() {
  $('modal-settings').classList.add('hidden');
}

function saveSettingsFromUI() {
  const radios = document.getElementsByName('font-size-option');
  let selectedFontSize = 'large';
  radios.forEach(radio => {
    if (radio.checked) selectedFontSize = radio.value;
  });
  
  const isShuffle = $('setting-shuffle-toggle').checked;
  
  saveSettings({
    fontSize: selectedFontSize,
    shuffle: isShuffle
  });
  
  closeSettingsModal();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Home
$('btn-add-deck').addEventListener('click', () => openDeckModal());
$('btn-open-settings').addEventListener('click', openSettingsModal);

// Study screen
$('btn-back').addEventListener('click', () => {
  showScreen('screen-home');
  renderHome();
});

$('btn-flip').addEventListener('click', flipCard);

$('btn-redo-wrong').addEventListener('click', () => {
  if (wrongCards.length === 0) return;
  const deckIdx = decks.indexOf(currentDeck);
  startStudy(deckIdx, true);
});

$('btn-redo-all').addEventListener('click', () => {
  const deckIdx = decks.indexOf(currentDeck);
  startStudy(deckIdx, false);
});

$('btn-back-home').addEventListener('click', () => {
  showScreen('screen-home');
  renderHome();
});

// Modal
$('btn-add-deck').addEventListener('click', () => openDeckModal());
$('modal-deck-close').addEventListener('click', closeDeckModal);
$('btn-cancel-deck').addEventListener('click', closeDeckModal);
$('btn-save-deck').addEventListener('click', saveDeck);
$('btn-delete-deck').addEventListener('click', deleteDeck);
$('btn-add-card').addEventListener('click', () => {
  editorCards.push({ id: genId(), front: '', back: '', phonetic: '', example: '' });
  renderCardsEditor();
  // Scroll to bottom
  const editor = $('cards-editor');
  setTimeout(() => editor.lastChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
});

// Close modal on overlay click
$('modal-deck').addEventListener('click', e => {
  if (e.target === $('modal-deck')) closeDeckModal();
});

// Settings Modal
$('modal-settings-close').addEventListener('click', closeSettingsModal);
$('btn-save-settings').addEventListener('click', saveSettingsFromUI);
$('modal-settings').addEventListener('click', e => {
  if (e.target === $('modal-settings')) closeSettingsModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if ($('screen-study').classList.contains('active')) {
    if (e.key === 'ArrowRight' || e.key === 'l') markCard(true);
    if (e.key === 'ArrowLeft' || e.key === 'h') markCard(false);
    if (e.key === ' ') { e.preventDefault(); flipCard(); }
  }
});

// ============================================================
// MOBILE: iOS KEYBOARD / VIEWPORT HANDLING
// ============================================================

// When the iOS keyboard opens, the visual viewport shrinks.
// We adjust the modal-body max-height so it doesn't get hidden.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const modal = $('modal-deck');
    if (!modal.classList.contains('hidden')) {
      const vh = window.visualViewport.height;
      const box = modal.querySelector('.modal-box');
      if (box) {
        box.style.maxHeight = Math.min(vh * 0.95, window.innerHeight * 0.95) + 'px';
      }
    }
  });
}

// Prevent default touch scroll while dragging a card
document.addEventListener('touchmove', e => {
  // Only block if there's an active card drag in progress
  if (document.querySelector('.flash-card') && e.cancelable) {
    // Allow vertical scroll in modal and home, block in study-main during swipe
    const studyMain = document.querySelector('.study-main');
    if (studyMain && studyMain.contains(e.target)) {
      // Will be managed by individual card's touch handler
    }
  }
}, { passive: true });

// ============================================================
// CARD LIST MODAL LOGIC
// ============================================================

function getSrsInfo(card) {
  if (!card.srs || card.srs.lastReviewed === 0) {
    return { retention: 0, nextText: '未学習' };
  }
  
  const now = Date.now();
  const elapsed = now - card.srs.lastReviewed;
  const intervalMs = card.srs.interval * 60 * 1000;
  
  let retention = 100;
  if (intervalMs > 0) {
    // Retention rate decays to 50% at the interval time (Leitner/SM2 scheduling)
    retention = Math.round(Math.exp(-0.693 * elapsed / intervalMs) * 100);
    retention = Math.max(0, Math.min(100, retention));
  } else {
    retention = 0;
  }
  
  let nextText = '';
  const diffMin = Math.round((card.srs.nextReview - now) / (60 * 1000));
  if (diffMin <= 0) {
    nextText = '今すぐ復習';
  } else if (diffMin < 60) {
    nextText = `${diffMin}分後`;
  } else {
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) {
      nextText = `${diffHours}時間後`;
    } else {
      nextText = `${Math.round(diffHours / 24)}日後`;
    }
  }
  
  return { retention, nextText };
}

function openCardListModal(type) {
  const modal = $('modal-card-list');
  const titleEl = $('modal-card-list-title');
  const container = $('card-list-container');
  
  const list = type === 'correct' ? correctCards : wrongCards;
  const label = type === 'correct' ? '覚えた単語' : '学習中の単語';
  
  titleEl.textContent = `${label} (${list.length})`;
  container.innerHTML = '';
  
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 0;">
        <div class="empty-state-icon" style="font-size: 2.5rem;">📭</div>
        <p>該当する単語はありません</p>
      </div>`;
  } else {
    list.forEach(card => {
      const srs = getSrsInfo(card);
      let retentionColor = '#f87171'; // Red
      if (srs.retention >= 80) {
        retentionColor = '#34d399'; // Green
      } else if (srs.retention >= 50) {
        retentionColor = '#fbbf24'; // Yellow
      }
      
      const item = document.createElement('div');
      item.className = 'list-card-item';
      item.innerHTML = `
        <div class="list-card-left">
          <div class="list-card-front">${escHtml(card.front)}</div>
          <div class="list-card-back">${escHtml(card.back)}</div>
          <div class="list-card-srs">
            <span class="srs-retention" style="color: ${retentionColor}">定着率: ${srs.retention}%</span>
            <span class="srs-separator">·</span>
            <span class="srs-next">次回: ${srs.nextText}</span>
          </div>
        </div>
        <button class="list-card-speak" title="英語読み上げ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>`;
      
      const speakBtn = item.querySelector('.list-card-speak');
      speakBtn.addEventListener('click', e => {
        e.stopPropagation();
        speakText(card.front);
      });
      
      container.appendChild(item);
    });
  }
  
  modal.classList.remove('hidden');
}

function closeCardListModal() {
  $('modal-card-list').classList.add('hidden');
}

// Badge click events
$('btn-show-learning').addEventListener('click', () => openCardListModal('learning'));
$('btn-show-correct').addEventListener('click', () => openCardListModal('correct'));

// Card list modal close events
$('modal-card-list-close').addEventListener('click', closeCardListModal);
$('btn-close-card-list').addEventListener('click', closeCardListModal);
$('modal-card-list').addEventListener('click', e => {
  if (e.target === $('modal-card-list')) closeCardListModal();
});

// ============================================================
// METRONOME LOGIC
// ============================================================

function updateMetroDots() {
  const container = document.querySelector('.metro-dots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < beatsPerMeasure; i++) {
    const dot = document.createElement('span');
    dot.className = 'metro-dot';
    dot.id = `metro-dot-${i}`;
    container.appendChild(dot);
  }
}

function highlightBeat(beatNumber) {
  for (let i = 0; i < beatsPerMeasure; i++) {
    const dot = $(`metro-dot-${i}`);
    if (dot) dot.className = 'metro-dot';
  }
  const currentDot = $(`metro-dot-${beatNumber}`);
  if (currentDot) {
    if (beatNumber === 0) {
      currentDot.classList.add('active-0');
    } else {
      currentDot.classList.add('active-other');
    }
  }
}

function clearActiveDots() {
  for (let i = 0; i < beatsPerMeasure; i++) {
    const dot = $(`metro-dot-${i}`);
    if (dot) dot.className = 'metro-dot';
  }
}

function nextBeat() {
  const secondsPerBeat = 60.0 / metroBpm;
  nextNoteTime += secondsPerBeat;
  currentBeat = (currentBeat + 1) % beatsPerMeasure;
}

function scheduleNote(beatNumber, time) {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.frequency.value = beatNumber === 0 ? 1000 : 800;
  
  gainNode.gain.setValueAtTime(1, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  osc.start(time);
  osc.stop(time + 0.05);

  const delay = (time - audioCtx.currentTime) * 1000;
  setTimeout(() => {
    if (isMetroPlaying) highlightBeat(beatNumber);
  }, Math.max(0, delay));
}

function metroScheduler() {
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(currentBeat, nextNoteTime);
    nextBeat();
  }
  metroTimerId = setTimeout(metroScheduler, lookahead);
}

function toggleMetronome() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const btn = $('btn-metro-toggle');
  if (isMetroPlaying) {
    stopMetronome();
  } else {
    isMetroPlaying = true;
    currentBeat = 0;
    nextNoteTime = audioCtx.currentTime;
    btn.classList.add('playing');
    btn.querySelector('.icon-play').classList.add('hidden');
    btn.querySelector('.icon-stop').classList.remove('hidden');
    metroScheduler();
  }
}

function stopMetronome() {
  isMetroPlaying = false;
  clearTimeout(metroTimerId);
  const btn = $('btn-metro-toggle');
  if (btn) {
    btn.classList.remove('playing');
    btn.querySelector('.icon-play').classList.remove('hidden');
    btn.querySelector('.icon-stop').classList.add('hidden');
  }
  clearActiveDots();
}

// Metronome Event Listeners
$('btn-metro-toggle').addEventListener('click', toggleMetronome);
$('slider-metro-bpm').addEventListener('input', e => {
  metroBpm = parseInt(e.target.value);
  $('label-metro-bpm').textContent = `${metroBpm} BPM`;
});

// ============================================================
// AUDIO CONTEXT HELPER
// ============================================================
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// ============================================================
// PACHINKO GACHA LOGIC
// ============================================================
function checkGachaChance() {
  const roll = Math.random();
  const triggerThreshold = isRushActive ? 1.0 : 0.2; // 100% in RUSH, 20% in normal
  
  if (roll < triggerThreshold) {
    startSlotSpin();
  }
}

function startSlotSpin() {
  if (isReelSpinning) return;
  isReelSpinning = true;
  
  // Show slot gacha mini dropdown overlay
  const modal = $('pachinko-mini-slot');
  if (modal) {
    modal.classList.remove('hidden');
  }
  
  // Update mini slot RUSH styles
  if (modal) {
    if (isRushActive) {
      modal.classList.add('rush-active');
    } else {
      modal.classList.remove('rush-active');
    }
  }
  
  const statusEl = $('pachinko-modal-status');
  if (statusEl) {
    statusEl.textContent = 'SPINNING...';
    statusEl.className = 'pachinko-status-mini neon-blink';
  }
  
  // 1/99 chance of winning
  const winRoll = Math.random();
  const isWin = winRoll < (1 / 99);
  
  let targetCombination = [];
  let triggersRush = false;
  
  if (isWin) {
    if (isRushActive) {
      triggersRush = true;
      targetCombination = [7, 7, 7];
    } else {
      triggersRush = Math.random() < 0.5; // 50% RUSH trigger
      if (triggersRush) {
        targetCombination = [7, 7, 7];
      } else {
        const digits = [1, 3, 5, 8];
        const d = digits[Math.floor(Math.random() * digits.length)];
        targetCombination = [d, d, d];
      }
    }
  } else {
    // Losing roll
    const d1 = Math.floor(Math.random() * 9) + 1;
    let d2 = Math.floor(Math.random() * 9) + 1;
    let d3 = Math.floor(Math.random() * 9) + 1;
    while (d2 === d1 && d3 === d1) {
      d2 = Math.floor(Math.random() * 9) + 1;
      d3 = Math.floor(Math.random() * 9) + 1;
    }
    targetCombination = [d1, d2, d3];
  }
  
  animateReels(targetCombination, isWin, triggersRush);
}

function animateReels(targets, isWin, triggersRush) {
  const reel0 = $('reel-0');
  const reel1 = $('reel-1');
  const reel2 = $('reel-2');
  if (!reel0 || !reel1 || !reel2) return;
  
  let count0 = 0;
  let count1 = 0;
  let count2 = 0;
  const spinInterval = 60;
  
  playSlotSpinSound();

  const int0 = setInterval(() => {
    reel0.textContent = Math.floor(Math.random() * 9) + 1;
    count0++;
    playReelTickSound();
    if (count0 > 15) {
      clearInterval(int0);
      reel0.textContent = targets[0];
      playReelStopSound();
    }
  }, spinInterval);

  const int1 = setInterval(() => {
    reel1.textContent = Math.floor(Math.random() * 9) + 1;
    count1++;
    playReelTickSound();
    if (count1 > 25) {
      clearInterval(int1);
      reel1.textContent = targets[1];
      playReelStopSound();
    }
  }, spinInterval);

  const int2 = setInterval(() => {
    reel2.textContent = Math.floor(Math.random() * 9) + 1;
    count2++;
    playReelTickSound();
    if (count2 > 35) {
      clearInterval(int2);
      reel2.textContent = targets[2];
      playReelStopSound();
      
      evaluateSlotResult(isWin, triggersRush);
    }
  }, spinInterval);
}

function evaluateSlotResult(isWin, triggersRush) {
  isReelSpinning = false;
  const statusEl = $('pachinko-modal-status');
  if (!statusEl) return;
  statusEl.className = 'pachinko-status-mini';
  
  if (isWin) {
    statusEl.textContent = 'WIN!';
    statusEl.classList.add('win-flash');
    
    const points = isRushActive ? 3000 : 1000;
    animateScoreIncrease(points);
    playWinFanfareSound();
    
    // Spawn winner particles from the center of the screen
    const studyScreen = $('screen-study');
    if (studyScreen) {
      const studyRect = studyScreen.getBoundingClientRect();
      const x = studyRect.width / 2;
      const y = studyRect.height / 2;
      spawnParticles(x, y, '#fbbf24');
    }

    setTimeout(() => {
      statusEl.classList.remove('win-flash');
      statusEl.textContent = 'READY';
      
      // Close mini slot dropdown
      const modal = $('pachinko-mini-slot');
      if (modal) {
        modal.classList.add('hidden');
      }
      
      if (triggersRush) {
        if (isRushActive) {
          rushTimeRemaining += 30; // Extend RUSH
          const statusEl = $('score-badge-status-text');
          if (statusEl) statusEl.textContent = `RUSH: ${rushTimeRemaining}s`;
          showToast('⚡ RUSH EXTENDED +30s! ⚡');
          playRushExtendSound();
        } else {
          isRushActive = true;
          startRush();
        }
      }
    }, 2200); // stay open for 2.2s on win
  } else {
    statusEl.textContent = 'READY';
    setTimeout(() => {
      // Close mini slot dropdown on miss
      const modal = $('pachinko-mini-slot');
      if (modal) {
        modal.classList.add('hidden');
      }
    }, 1200); // stay open for 1.2s on miss
  }
}

function animateScoreIncrease(amount) {
  const scoreValEl = $('pachinko-score-val');
  if (!scoreValEl) return;
  const targetScore = score + amount;
  const step = Math.ceil(amount / 20);
  
  const timer = setInterval(() => {
    score += step;
    if (score >= targetScore) {
      score = targetScore;
      clearInterval(timer);
      saveScore(score);
    }
    scoreValEl.textContent = String(score).padStart(5, '0');
  }, 30);
}

// ============================================================
// RUSH TIMER LOGIC
// ============================================================
function startRush() {
  if (rushTimerInterval) clearInterval(rushTimerInterval);
  
  if (rushTimeRemaining <= 0) {
    rushTimeRemaining = 100;
  }
  
  showToast('🔥 RUSH ENTERED! 100% GACHA RATE 🔥');
  playRushSirenSound();
  resumeRush();
}

function resumeRush() {
  if (rushTimerInterval) clearInterval(rushTimerInterval);
  
  const scoreBadge = $('btn-pachinko-score');
  if (scoreBadge) scoreBadge.classList.add('rush-active');
  
  const statusEl = $('score-badge-status-text');
  if (statusEl) statusEl.textContent = `RUSH: ${rushTimeRemaining}s`;

  rushTimerInterval = setInterval(() => {
    rushTimeRemaining--;
    if (rushTimeRemaining <= 0) {
      endRush();
    } else {
      if (statusEl) statusEl.textContent = `RUSH: ${rushTimeRemaining}s`;
    }
  }, 1000);
}

function pauseRush() {
  if (rushTimerInterval) {
    clearInterval(rushTimerInterval);
    rushTimerInterval = null;
  }
}

function endRush() {
  rushTimeRemaining = 0;
  isRushActive = false;
  pauseRush();
  
  showToast('RUSH ENDED');
  playRushEndSound();
  resetRushUI();
}

function resetRushUI() {
  const scoreBadge = $('btn-pachinko-score');
  if (scoreBadge) scoreBadge.classList.remove('rush-active');
  const statusEl = $('score-badge-status-text');
  if (statusEl) statusEl.textContent = 'SCORE';
}

// ============================================================
// PARTICLE ANIMATION ENGINE
// ============================================================
function initParticleCanvas() {
  particleCanvas = $('particle-canvas');
  if (!particleCanvas) return;
  particleCtx = particleCanvas.getContext('2d');
  
  resizeParticleCanvas();
  window.addEventListener('resize', resizeParticleCanvas);
}

function resizeParticleCanvas() {
  if (!particleCanvas) return;
  const studyScreen = $('screen-study');
  if (studyScreen) {
    const rect = studyScreen.getBoundingClientRect();
    particleCanvas.width = rect.width;
    particleCanvas.height = rect.height;
  }
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 80,
      y: y + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 6 - 3, // fly upwards
      alpha: 1.0,
      decay: Math.random() * 0.015 + 0.01,
      size: Math.random() * 4 + 2,
      color: color || '#fbbf24'
    });
  }
  
  if (!particleAnimationId) {
    updateParticles();
  }
}

function updateParticles() {
  if (!particleCanvas || !particleCtx) return;
  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    } else {
      particleCtx.save();
      particleCtx.globalAlpha = p.alpha;
      
      // glow
      particleCtx.shadowBlur = p.size * 2;
      particleCtx.shadowColor = p.color;
      
      particleCtx.fillStyle = p.color;
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.restore();
    }
  }
  
  if (particles.length > 0) {
    particleAnimationId = requestAnimationFrame(updateParticles);
  } else {
    particleAnimationId = null;
  }
}

// ============================================================
// AUDIO SOUND SYNTHESIS
// ============================================================
function playReelTickSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.frequency.value = 1400;
  gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.02);
}

function playReelStopSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'triangle';
  osc.frequency.value = 650;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

// Metronome Event Listeners
$('btn-metro-toggle').addEventListener('click', toggleMetronome);
$('slider-metro-bpm').addEventListener('input', e => {
  metroBpm = parseInt(e.target.value);
  $('label-metro-bpm').textContent = `${metroBpm} BPM`;
});

// Debug triggers on Score badge:
// - Single click: force a slot spin
// - Double click: toggle RUSH mode
setTimeout(() => {
  const scoreBadgeEl = document.querySelector('.study-score-badge');
  if (scoreBadgeEl) {
    scoreBadgeEl.addEventListener('click', e => {
      if (e.detail === 1) {
        setTimeout(() => {
          if (!isRushActive && !isReelSpinning) {
            initAudioContext();
            startSlotSpin();
          }
        }, 220);
      }
    });
    scoreBadgeEl.addEventListener('dblclick', () => {
      initAudioContext();
      if (isRushActive) {
        endRush();
      } else {
        isRushActive = true;
        startRush();
      }
    });
  }
}, 100);

function playSlotSpinSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.setValueAtTime(1100, now + 0.06);
  
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  
  osc.start(now);
  osc.stop(now + 0.12);
}

function playWinFanfareSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    
    const time = now + idx * 0.12;
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    
    osc.start(time);
    osc.stop(time + 0.25);
  });
}

function playRushSirenSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(1300, now + 0.8);
  
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  
  osc.start(now);
  osc.stop(now + 0.8);
}

function playRushExtendSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.setValueAtTime(1300, now + 0.1);
  osc.frequency.setValueAtTime(1800, now + 0.2);
  
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  
  osc.start(now);
  osc.stop(now + 0.35);
}

function playRushEndSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.frequency.setValueAtTime(750, now);
  osc.frequency.linearRampToValueAtTime(180, now + 0.5);
  
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  
  osc.start(now);
  osc.stop(now + 0.5);
}

// ============================================================
// INIT
// ============================================================

async function initApp() {
  const hasGoldPhrase = decks.some(d => d.id === 'gold-phrase');
  if (!hasGoldPhrase) {
    try {
      const response = await fetch('gold_phrase.json');
      if (response.ok) {
        const goldDeck = await response.json();
        goldDeck.createdAt = Date.now();
        decks.push(goldDeck);
        saveDecks(decks);
      }
    } catch (e) {
      console.error('Failed to auto-load gold_phrase.json:', e);
    }
  }
  renderHome();
  updateMetroDots();
  initParticleCanvas();
}

initApp();
