import { initializeApp }
  from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics }
  from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

/* ── Firebase init ── */
const app = initializeApp({
  apiKey:            "AIzaSyCeSLeVlfivD9XS128dUT-0MJ9W184f8kg",
  authDomain:        "aroundtheseneya.firebaseapp.com",
  projectId:         "aroundtheseneya",
  storageBucket:     "aroundtheseneya.firebasestorage.app",
  messagingSenderId: "1060210818222",
  appId:             "1:1060210818222:web:0a67cb5465b45fc4f6413f",
  measurementId:     "G-H0NRR5X4JM"
});
getAnalytics(app);
const auth = getAuth(app);
const db   = getFirestore(app);

/* Module loaded — re-enable auth button */
const _authBtn = document.getElementById('btn-auth-submit');
if (_authBtn) { _authBtn.disabled = false; _authBtn.style.opacity = ''; _authBtn.textContent = 'دخول — Sign In'; }

/* ── PWA service worker ── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

/* ══════════ SOUND ══════════ */
let audioCtx    = null;
let soundEnabled = localStorage.getItem('seneya_sound') !== 'false';

document.getElementById('btn-sound').textContent = soundEnabled ? '🔊' : '🔇';

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playDraw() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 1.5) * 0.28;
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.8;
    src.buffer = buf; src.connect(f); f.connect(ctx.destination); src.start();
  } catch(e){}
}

function playSkip() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const len = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2) * 0.15;
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2200;
    src.buffer = buf; src.connect(f); f.connect(ctx.destination); src.start();
  } catch(e){}
}

function playDone() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      const t   = ctx.currentTime + i * 0.13;
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.55);
    });
  } catch(e){}
}

function playFavSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1108, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch(e){}
}

window.toggleSound = function() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('seneya_sound', soundEnabled);
  document.getElementById('btn-sound').textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playDraw();
};

/* ══════════ THEME TOGGLE ══════════ */
const THEME_DARK_VARS = {
  '--cream':'#1C0E0A','--warm-white':'#231510','--blush':'#2A1812','--blush-deep':'#321E15',
  '--ink':'#F0D5CC','--ink-soft':'#C4907A','--muted':'#8A6050','--nude':'#3A2018','--gold-light':'#2A1E10'
};
const THEME_LIGHT_VARS = {
  '--cream':'#FDF8F4','--warm-white':'#FFF9F6','--blush':'#F7EDE9','--blush-deep':'#EED5CC',
  '--ink':'#1C0E0A','--ink-soft':'#4A2820','--muted':'#A07060','--nude':'#F2DDD5','--gold-light':'#F5EAD8'
};

let currentTheme = localStorage.getItem('seneya_theme') || 'auto';

function applyTheme(theme) {
  Object.keys(THEME_DARK_VARS).forEach(k => document.documentElement.style.removeProperty(k));
  const vars = theme === 'dark' ? THEME_DARK_VARS : theme === 'light' ? THEME_LIGHT_VARS : null;
  if (vars) Object.entries(vars).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
  document.body.classList.remove('force-dark','force-light');
  if (theme === 'dark') document.body.classList.add('force-dark');
  if (theme === 'light') document.body.classList.add('force-light');
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓';
}

window.toggleTheme = function() {
  currentTheme = currentTheme === 'auto' ? 'dark' : currentTheme === 'dark' ? 'light' : 'auto';
  localStorage.setItem('seneya_theme', currentTheme);
  applyTheme(currentTheme);
};

applyTheme(currentTheme);

/* ══════════ CHALLENGE TOGGLE ══════════ */
let challengesEnabled = localStorage.getItem('seneya_challenges') !== 'off';

function applyChallengeState() {
  const btn = document.getElementById('btn-challenges');
  const game = document.getElementById('game');
  if (challengesEnabled) {
    game.classList.remove('challenges-hidden');
    if (btn) { btn.classList.remove('off'); btn.title = 'Challenges ON'; }
  } else {
    game.classList.add('challenges-hidden');
    if (btn) { btn.classList.add('off'); btn.title = 'Challenges OFF'; }
  }
}

window.toggleChallenges = function() {
  challengesEnabled = !challengesEnabled;
  localStorage.setItem('seneya_challenges', challengesEnabled ? 'on' : 'off');
  applyChallengeState();
};

applyChallengeState();

/* ══════════ SESSION TIMER ══════════ */
let sessionStart  = null;
let timerInterval = null;

function startSessionTimer() {
  sessionStart = Date.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const e = Date.now() - sessionStart;
    const m = Math.floor(e / 60000);
    const s = Math.floor((e % 60000) / 1000);
    const el = document.getElementById('s-time');
    if (el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  }, 1000);
}

function stopSessionTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  sessionStart  = null;
  const el = document.getElementById('s-time');
  if (el) el.textContent = '0:00';
}

/* ══════════ AUTH STATE ══════════ */
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('user-email').textContent = user.displayName || user.email;
    loadAllProgress(user.uid);
    loadFavourites(user.uid);
    await loadPremiumStatus(user.uid);
    if (localStorage.getItem('seneya_pair_skipped') || partnerUid) {
      goToEditionSelect();
    } else {
      await checkPairing(user.uid);
    }
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    ['edition-select','pair-screen','landing','game'].forEach(id =>
      document.getElementById(id).classList.remove('on'));
    allProgress = {}; favourites = [];
  }
});

function transition(cb) {
  const veil = document.getElementById('page-veil');
  veil.classList.add('fading');
  setTimeout(() => {
    cb();
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.remove('fading')));
  }, 220);
}

/* ══════════ FIRESTORE — PROGRESS ══════════ */
let allProgress = {};
let saveTimer   = null;

async function loadAllProgress(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'meta', 'progress'));
    allProgress = snap.exists() ? (snap.data().editions || {}) : {};
  } catch(e) { allProgress = {}; }
  updateEditionProgressBadges();
  updateLifetimeDisplay();
}

function scheduleSave() {
  if (!currentUser || !currentEdition) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistProgress, 1500);
}

async function persistProgress() {
  if (!currentUser || !currentEdition) return;
  try {
    allProgress[currentEdition] = { drawn, round, used, currentCat, lastPlayed: Date.now() };
    await setDoc(doc(db, 'users', currentUser.uid, 'meta', 'progress'),
      { editions: allProgress }, { merge: true });
  } catch(e){}
}

async function clearEditionProgress(edition) {
  if (!currentUser) return;
  try {
    delete allProgress[edition];
    await setDoc(doc(db, 'users', currentUser.uid, 'meta', 'progress'),
      { editions: allProgress }, { merge: true });
  } catch(e){}
}

function getEditionCats(edition) {
  if (edition === 'friends')      return ['soft_friends','real_friends','psych_friends','between_friends','power_friends','friendship_deep','challenges_friends'];
  if (edition === 'spicy')        return ['spicy_part1','spicy_part2','spicy_part3','spicy_part4'];
  if (edition === 'talking')      return ['soft_talking','real_talking','psych_talking','between_talking','power_talking','desires_talking'];
  if (edition === 'couples')      return ['soft_couples','real_couples','psych_couples','between_couples','power_couples','desires_couples','future_couples'];
  if (edition === 'stillus')      return ['distance_su','stayed_su','unsaid_su','patterns_su','choosing_su','final_su'];
  if (edition === 'engaged')      return ['soft_engaged','real_engaged','psych_engaged','between_engaged','power_engaged','promise_engaged','home_engaged'];
  if (edition === 'secretfiles')  return ['secrets_sf','laughs_sf','likely_sf','cringe_sf','chaos_sf'];
  if (edition === 'family')       return ['energy_fam','chaos_fam','feels_fam','night_fam','forever_fam'];
  if (edition === 'betweenus')    return ['between_bt','debates_bt','midnight_bt','real_bt'];
  if (edition === 'overthinkers') return ['mind_3am','insecurities_ot','mindvsheart_ot','healing_ot'];
  if (edition === 'healing')      return ['whathurt_h','healingprocess_h','neversay_h','newversion_h','softness_h'];
  if (edition === 'solo')         return ['whoami_s','thoughts_s','healing_s','future_s','selflove_s'];
  if (edition === 'masks')        return ['showpeople_m','hiddenself_m','maskexists_m','exhaustion_m','unmasking_m'];
  if (edition === 'loveyourself') return ['seeing_ly','softenergy_ly','healself_ly','innerworld_ly','becoming_ly'];
  if (edition === 'future')       return ['dreamlife_f','lovenext_f','fears_f','success_f','letters_f'];
  if (edition === 'redflags')     return ['turnoffs_rf','greenflags_rf','toxic_rf','standards_rf','opinions_rf'];
  if (edition === 'girlsnight')   return ['girlhood_gn','feminine_gn','love_gn','neversay_gn','forever_gn'];
  if (edition === 'whoknows')     return ['littlethings_wk','mindread_wk','loveread_wk','realme_wk','memories_wk'];
  if (edition === 'firstimpact')  return ['howseeme_fi','perception_fi','relimpress_fi','truthvibe_fi'];
  if (edition === 'artist')       return ['identity_ar','block_ar','emotions_ar','dreams_ar'];
  const cats = ['soft','real','psych','between','power',`desires_${edition}`];
  if (edition === 'married') cats.push('future_married');
  return cats;
}

function updateQuickContinue() {
  const el = document.getElementById('quick-continue');
  if (!el) return;
  const entries = Object.entries(allProgress)
    .filter(([, p]) => p && p.drawn > 0)
    .sort((a, b) => (b[1].lastPlayed || 0) - (a[1].lastPlayed || 0));
  if (!entries.length) { el.style.display = 'none'; return; }
  const [key, prog] = entries[0];
  const ed = EDITIONS[key];
  if (!ed) { el.style.display = 'none'; return; }
  const cats = getEditionCats(key);
  const total = cats.reduce((s, c) => s + (CATEGORIES[c]?.qs.length || 0), 0);
  document.getElementById('qc-edition-name').textContent = `${ed.icon} Continue ${ed.name}`;
  document.getElementById('qc-detail').textContent = `Round ${prog.round} · ${prog.drawn} / ${total} questions`;
  el.onclick = () => selectEdition(key);
  el.style.display = 'flex';
}

function updateEditionProgressBadges() {
  Object.keys(EDITIONS).forEach(key => {
    const el = document.getElementById(`ep-${key}`);
    if (!el) return;
    const p = allProgress[key];
    if (p && p.drawn > 0) {
      const cats = getEditionCats(key);
      const total = cats.reduce((s, c) => s + (CATEGORIES[c]?.qs.length || 0), 0);
      el.textContent = `${p.drawn} / ${total} · Round ${p.round}`;
      el.classList.add('has-data');
    } else {
      el.textContent = '';
      el.classList.remove('has-data');
    }
  });
  updateQuickContinue();
}

function updateLifetimeDisplay() {
  const total = Object.values(allProgress).reduce((s, p) => s + (p?.drawn || 0), 0);
  const el = document.getElementById('es-lifetime');
  if (!el) return;
  if (total > 0) {
    el.textContent = `✦ ${total} questions explored across all editions`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

/* ══════════ FIRESTORE — FAVOURITES ══════════ */
let favourites = [];

async function loadFavourites(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'meta', 'favourites'));
    favourites = snap.exists() ? (snap.data().items || []) : [];
  } catch(e) { favourites = []; }
  updateFavUI();
}

async function saveFavourites() {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'meta', 'favourites'),
      { items: favourites }, { merge: false });
  } catch(e){}
}

function updateFavUI() {
  const btn   = document.getElementById('btn-fav-open');
  const count = document.getElementById('fav-count');
  if (btn && count) {
    count.textContent = favourites.length;
    btn.style.display = favourites.length > 0 ? 'flex' : 'none';
  }
}

window.toggleFav = function() {
  if (!currentQuestion) return;
  const idx = favourites.findIndex(f => f.en === currentQuestion.en && f.edition === currentEdition);
  if (idx >= 0) {
    favourites.splice(idx, 1);
  } else {
    favourites.push({ en: currentQuestion.en, ar: currentQuestion.ar, cat: currentCat, edition: currentEdition, savedAt: Date.now() });
    sessionFavs++;
    playFavSound();
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  }
  const isFav = idx < 0; // was added
  const favBtn = document.querySelector('.btn-card-fav');
  if (favBtn) {
    favBtn.classList.toggle('fav-active', isFav);
    favBtn.textContent = isFav ? '♥' : '♡';
  }
  updateFavUI();
  saveFavourites();
};

window.shareCard = async function() {
  if (!currentQuestion) return;
  const text = `${currentQuestion.en}\n\n${currentQuestion.ar}\n\n— Around the Seneya · حول الصينية`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Around the Seneya', text }); } catch(e){}
  } else {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard · تم النسخ ✓');
    } catch(e) { toast('Share not available on this device'); }
  }
};

window.openFavSheet = function() {
  const list  = document.getElementById('fav-list');
  const empty = document.getElementById('fav-empty');
  if (favourites.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    list.innerHTML = favourites.slice().reverse().map((f, i) => {
      const cat = CATEGORIES[f.cat];
      const ed  = EDITIONS[f.edition];
      const realIdx = favourites.length - 1 - i;
      return `<div class="fav-item">
        <div class="fav-item-meta">${cat?.sym || '💕'} ${cat?.en || f.cat} · ${ed?.name || f.edition}</div>
        <div class="fav-item-q-en">${f.en}</div>
        <div class="fav-item-q-ar">${f.ar}</div>
        <button class="fav-item-del" onclick="removeFav(${realIdx})">✕</button>
      </div>`;
    }).join('');
  }
  document.getElementById('fav-sheet').classList.add('open');
};

window.closeFavSheet = function() {
  document.getElementById('fav-sheet').classList.remove('open');
};

window.removeFav = function(idx) {
  favourites.splice(idx, 1);
  updateFavUI();
  saveFavourites();
  window.openFavSheet();
};

/* ══════════ AUTH ══════════ */
let authMode = 'login';

window.switchTab = function(mode) {
  authMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register').classList.toggle('active', mode === 'register');
  document.getElementById('field-name').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('btn-auth-submit').textContent =
    mode === 'register' ? 'إنشاء حساب — Create Account' : 'دخول — Sign In';
  hideAuthError();
};

window.handleAuth = async function() {
  const email    = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value;
  const name     = document.getElementById('input-name').value.trim();
  const btn      = document.getElementById('btn-auth-submit');
  hideAuthError();
  if (!email || !password) { showAuthError('Enter your email and password · أدخل البريد وكلمة المرور'); return; }
  if (authMode === 'register' && password.length < 6) { showAuthError('Password must be 6+ characters · كلمة المرور 6 أحرف على الأقل'); return; }
  btn.disabled  = true;
  btn.innerHTML = '<span class="auth-loading"></span> جاري التحميل…';
  try {
    if (authMode === 'register') {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch(err) {
    btn.disabled    = false;
    btn.textContent = authMode === 'register' ? 'إنشاء حساب — Create Account' : 'دخول — Sign In';
    showAuthError(friendlyError(err.code));
  }
};

window.handleSignOut = async function() {
  clearTimeout(saveTimer);
  await persistProgress();
  drawn = 0; round = 1; used = {}; currentEdition = null; currentCat = 'soft'; currentCats = [];
  partnerUid = null; myPairCode = null;
  stopSessionTimer(); updateStats();
  await signOut(auth);
};

function showAuthError(msg) { const el = document.getElementById('auth-error'); el.textContent = msg; el.classList.add('show'); }
function hideAuthError()    { document.getElementById('auth-error').classList.remove('show'); }
function friendlyError(code) {
  return ({
    'auth/user-not-found':         'No account with this email · لا يوجد حساب بهذا البريد',
    'auth/wrong-password':         'Wrong password · كلمة المرور غير صحيحة',
    'auth/invalid-credential':     'Invalid email or password · بريد أو كلمة مرور غير صحيحة',
    'auth/email-already-in-use':   'Email already registered · هذا البريد مسجل مسبقاً',
    'auth/invalid-email':          'Invalid email · البريد غير صالح',
    'auth/weak-password':          'Password too weak · كلمة المرور ضعيفة',
    'auth/too-many-requests':      'Too many attempts, try later · محاولات كثيرة',
    'auth/network-request-failed': 'Network error · خطأ في الشبكة',
  })[code] || `Error: ${code}`;
}

/* ══════════ SCREEN HELPER ══════════ */
function showScreen(id) {
  ['edition-select','pair-screen'].forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    if (s === id) el.classList.add('on');
    else          el.classList.remove('on');
  });
}

/* ══════════ PARTNER PAIRING ══════════ */
let partnerUid  = null;
let myPairCode  = null;

async function checkPairing(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'meta', 'pair'));
    if (snap.exists()) {
      myPairCode = snap.data().code;
      if (snap.data().partnerUid) {
        partnerUid = snap.data().partnerUid;
        goToEditionSelect(); return;
      }
    } else {
      myPairCode = await ensurePairCode(uid);
    }
  } catch(e) { goToEditionSelect(); return; }
  if (localStorage.getItem('seneya_pair_skipped')) { goToEditionSelect(); return; }
  document.getElementById('pair-code-display').textContent = myPairCode || '——————';
  showScreen('pair-screen');
}

async function ensurePairCode(uid) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code, taken = true;
  while (taken) {
    code = Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
    taken = (await getDoc(doc(db, 'pairCodes', code))).exists();
  }
  await setDoc(doc(db, 'pairCodes', code), { uid, createdAt: serverTimestamp() });
  await setDoc(doc(db, 'users', uid, 'meta', 'pair'), { code }, { merge: true });
  return code;
}

window.sharePairCode = async function() {
  const text = `Join me on Around the Seneya! Enter my code: ${myPairCode}`;
  if (navigator.share) {
    try { await navigator.share({ text }); } catch(e){}
  } else {
    try { await navigator.clipboard.writeText(myPairCode); toast('Code copied! 📋'); } catch(e) {}
  }
};

window.joinWithCode = async function() {
  const code  = document.getElementById('pair-input').value.trim().toUpperCase();
  const errEl = document.getElementById('pair-error');
  errEl.textContent = '';
  if (code.length !== 6) { errEl.textContent = 'Enter a 6-letter code'; return; }
  if (code === myPairCode) { errEl.textContent = "That's your own code!"; return; }
  const snap = await getDoc(doc(db, 'pairCodes', code));
  if (!snap.exists()) { errEl.textContent = 'Code not found. Check and try again.'; return; }
  const uid = auth.currentUser.uid;
  const theirUid = snap.data().uid;
  await setDoc(doc(db, 'users', uid, 'meta', 'pair'),
    { partnerUid: theirUid, pairedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, 'users', theirUid, 'meta', 'pair'),
    { partnerUid: uid, pairedAt: serverTimestamp() }, { merge: true });
  partnerUid = theirUid;
  toast('💑 Connected!');
  goToEditionSelect();
};

window.skipPairing = function() {
  localStorage.setItem('seneya_pair_skipped', '1');
  goToEditionSelect();
};

function goToEditionSelect() {
  updatePairButton();
  showScreen('edition-select');
}

function updatePairButton() {
  const btn   = document.getElementById('btn-pair-manage');
  const label = document.getElementById('pair-manage-label');
  if (!btn || !label) return;
  if (partnerUid) {
    label.textContent = 'Paired';
    btn.classList.add('is-paired');
    btn.title = 'Change or remove partner';
  } else {
    label.textContent = 'Pair';
    btn.classList.remove('is-paired');
    btn.title = 'Connect with your partner';
  }
}

window.openPairScreen = function() {
  localStorage.removeItem('seneya_pair_skipped');
  if (myPairCode) document.getElementById('pair-code-display').textContent = myPairCode;
  const unpairBtn = document.getElementById('btn-unpair');
  if (unpairBtn) unpairBtn.style.display = partnerUid ? 'block' : 'none';
  const togetherSection = document.getElementById('together-section');
  if (togetherSection) togetherSection.style.display = partnerUid ? 'flex' : 'none';
  const title = document.querySelector('.pair-title');
  if (title) title.childNodes[0].textContent = partnerUid
    ? "You're paired! 💑\n"
    : "Let's connect with your partner.\n";
  showScreen('pair-screen');
};

window.showTogetherEditionPicker = function() {
  const list = document.getElementById('together-edition-list');
  list.innerHTML = Object.entries(EDITIONS).map(([key, ed]) =>
    `<button class="together-ed-btn" onclick="startTogetherSession('${key}');document.getElementById('together-picker').style.display='none'">
      ${ed.icon} ${ed.name}
    </button>`
  ).join('');
  document.getElementById('together-picker').style.display = 'flex';
};

window.unpairAccount = async function() {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'meta', 'pair'),
      { partnerUid: null }, { merge: true });
    partnerUid = null;
    updatePairButton();
    toast('Partner removed. You can pair with someone new.');
    document.getElementById('pair-input').value = '';
    document.getElementById('pair-error').textContent = '';
    document.getElementById('pair-code-display').textContent = myPairCode || '——————';
  } catch(e) { toast('Something went wrong.'); }
};

/* ══════════ LIVE SESSION (PLAY TOGETHER) ══════════ */
let isDealer      = false;
let sessionUnsub  = null;
let liveSessionId = null;

function getSessionId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

window.startTogetherSession = async function(edition) {
  const uid = auth.currentUser.uid;
  liveSessionId = getSessionId(uid, partnerUid);
  isDealer = true;
  try {
    await setDoc(doc(db, 'sessions', liveSessionId), {
      dealerUid: uid, partnerUid,
      edition, cat: getEditionCats(edition)[0],
      currentCard: null, action: 'waiting',
      drawn: 0, round: 1, used: {},
      status: 'active', updatedAt: serverTimestamp()
    });
  } catch(e) { toast('Could not start session. Check connection.'); return; }
  subscribeToSession(liveSessionId);
  selectEdition(edition);
};

function subscribeToSession(sessionId) {
  if (sessionUnsub) { sessionUnsub(); sessionUnsub = null; }
  sessionUnsub = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
    if (!snap.exists() || snap.data().status === 'ended') return;
    const data = snap.data();
    if (!isDealer && data.currentCard && data.action === 'draw') {
      renderLiveCard(data.currentCard, data.cat);
    }
    updateLiveBanner(data);
  });
}

window.joinPartnerSession = async function() {
  const uid = auth.currentUser.uid;
  liveSessionId = getSessionId(uid, partnerUid);
  isDealer = false;
  const snap = await getDoc(doc(db, 'sessions', liveSessionId));
  if (!snap.exists() || snap.data().status !== 'active') {
    toast('No active session from your partner yet.'); return;
  }
  subscribeToSession(liveSessionId);
  const data = snap.data();
  currentEdition = data.edition;
  currentCats = getEditionCats(data.edition);
  currentCat  = data.cat || currentCats[0];
  buildGameInterface(currentCats);
  transition(() => {
    document.getElementById('edition-select').classList.remove('on');
    document.getElementById('game').classList.add('on');
    resetWelcomeCard(false);
  });
  updateLiveBanner(data);
};

function updateLiveBanner(data) {
  const banner = document.getElementById('live-banner');
  if (!banner) return;
  if (isDealer) {
    banner.innerHTML = `<span class="live-dot"></span> Live · Partner is watching`;
  } else {
    banner.innerHTML = `<span class="live-dot"></span> Live · Waiting for partner to draw…`;
  }
  banner.style.display = 'flex';
}

function renderLiveCard(card, cat) {
  const catData = CATEGORIES[cat];
  if (!catData) return;
  currentQuestion = card;
  currentCat = cat;
  document.getElementById('card-stage').innerHTML = `
    <div class="q-card-wrap">
      <div class="q-card ${catData.bgClass}">
        <div class="card-overlay"></div>
        <div class="card-deco tl">🌹</div>
        <div class="card-deco br">🌹</div>
        <div class="card-badge">
          <span class="badge-sym">${catData.sym}</span>
          <span class="badge-en">${catData.en}</span>
          <span class="badge-ar">· ${catData.ar}</span>
        </div>
        <div class="card-body">
          <div class="card-q-en">${card.en}</div>
          <div class="card-divider"></div>
          <div class="card-q-ar">${card.ar}</div>
        </div>
        <div class="card-footer">
          <span class="card-num">💑 Partner's draw</span>
          <div class="card-footer-actions">
            <button class="btn-card-action btn-card-fav" onclick="toggleFav()" title="Save">♡</button>
          </div>
        </div>
      </div>
    </div>`;
}

window.endLiveSession = async function() {
  if (liveSessionId) {
    try { await updateDoc(doc(db, 'sessions', liveSessionId), { status: 'ended' }); } catch(e){}
  }
  if (sessionUnsub) { sessionUnsub(); sessionUnsub = null; }
  liveSessionId = null; isDealer = false;
  document.getElementById('live-banner').style.display = 'none';
};

/* ══════════ PREMIUM / MEMBERSHIP ══════════ */
let isPremium = !!localStorage.getItem('seneya_premium');

async function loadPremiumStatus(uid) {
  if (isPremium) return;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'meta', 'account'));
    if (snap.exists() && snap.data().premium) {
      isPremium = true;
      localStorage.setItem('seneya_premium', '1');
    }
  } catch(e){}
}

window.openUnlockModal = function() {
  document.getElementById('unlock-modal').classList.add('open');
};

window.closeUnlockModal = function() {
  document.getElementById('unlock-modal').classList.remove('open');
  document.getElementById('promo-error').textContent = '';
  document.getElementById('promo-input').value = '';
};

window.activatePromo = async function() {
  const code  = document.getElementById('promo-input').value.trim().toUpperCase();
  const errEl = document.getElementById('promo-error');
  errEl.textContent = '';
  if (!code) { errEl.textContent = 'Enter a promo code'; return; }
  try {
    const snap = await getDoc(doc(db, 'promoCodes', code));
    if (!snap.exists() || !snap.data().active) { errEl.textContent = 'Invalid code.'; return; }
    if (snap.data().uses >= snap.data().maxUses) { errEl.textContent = 'Code already used up.'; return; }
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, 'users', uid, 'meta', 'account'),
      { premium: true, unlockedAt: serverTimestamp(), promoCode: code }, { merge: true });
    isPremium = true;
    localStorage.setItem('seneya_premium', '1');
    // best-effort increment — won't block unlock if rules deny it
    try { await updateDoc(doc(db, 'promoCodes', code), { uses: increment(1) }); } catch(_){}
    closeUnlockModal();
    toast('🎉 Premium unlocked! All categories are now open.');
    if (currentEdition) buildGameInterface(currentCats);
  } catch(e) {
    console.error('activatePromo error:', e);
    errEl.textContent = 'Something went wrong. Try again.';
  }
};

/* ══════════ GAME DATA ══════════ */
const SINEYA_SVG = `<svg class="sineya-svg" viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sgCu" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#F5D090"/><stop offset="22%" stop-color="#DFAA68"/><stop offset="58%" stop-color="#BF8048"/><stop offset="100%" stop-color="#8A5028"/></radialGradient><radialGradient id="sgSh" cx="37%" cy="30%" r="50%"><stop offset="0%" stop-color="rgba(255,248,210,0.5)"/><stop offset="100%" stop-color="rgba(255,210,120,0)"/></radialGradient></defs><ellipse cx="140" cy="156" rx="118" ry="11" fill="rgba(0,0,0,0.18)"/><circle cx="140" cy="138" r="126" fill="url(#sgCu)"/><circle cx="140" cy="138" r="126" fill="none" stroke="#EBC472" stroke-width="5" stroke-dasharray="5 3.2" opacity="0.7"/><circle cx="140" cy="138" r="121" fill="none" stroke="#7A4418" stroke-width="0.8" opacity="0.5"/><circle cx="140" cy="138" r="108" fill="none" stroke="#7A4418" stroke-width="1.1" opacity="0.6"/><g fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.85" opacity="0.8"><g transform="translate(140,138) rotate(0)"><path d="M 0,-114 L 7,-105 L 0,-96 L -7,-105 Z"/></g><g transform="translate(140,138) rotate(45)"><path d="M 0,-114 L 7,-105 L 0,-96 L -7,-105 Z"/></g><g transform="translate(140,138) rotate(90)"><path d="M 0,-114 L 7,-105 L 0,-96 L -7,-105 Z"/></g><g transform="translate(140,138) rotate(135)"><path d="M 0,-114 L 7,-105 L 0,-96 L -7,-105 Z"/></g><g transform="translate(140,138) rotate(180)"><path d="M 0,-114 L 7,-105 L 0,-96 L -7,-105 Z"/></g><g transform="translate(140,138) rotate(225)"><path d="M 0,-114 L 7,-105 L 0,-96 L -7,-105 Z"/></g><g transform="translate(140,138) rotate(270)"><path d="M 0,-114 L 7,-105 L 0,-96 L -7,-105 Z"/></g><g transform="translate(140,138) rotate(315)"><path d="M 0,-114 L 7,-105 L 0,-96 L -7,-105 Z"/></g></g><g fill="rgba(55,20,5,0.1)" stroke="#7A4418" stroke-width="0.7" opacity="0.7"><g transform="translate(140,138) rotate(22.5)"><path d="M 0,-114 L 4,-109 L 0,-104 L -4,-109 Z"/></g><g transform="translate(140,138) rotate(67.5)"><path d="M 0,-114 L 4,-109 L 0,-104 L -4,-109 Z"/></g><g transform="translate(140,138) rotate(112.5)"><path d="M 0,-114 L 4,-109 L 0,-104 L -4,-109 Z"/></g><g transform="translate(140,138) rotate(157.5)"><path d="M 0,-114 L 4,-109 L 0,-104 L -4,-109 Z"/></g><g transform="translate(140,138) rotate(202.5)"><path d="M 0,-114 L 4,-109 L 0,-104 L -4,-109 Z"/></g><g transform="translate(140,138) rotate(247.5)"><path d="M 0,-114 L 4,-109 L 0,-104 L -4,-109 Z"/></g><g transform="translate(140,138) rotate(292.5)"><path d="M 0,-114 L 4,-109 L 0,-104 L -4,-109 Z"/></g><g transform="translate(140,138) rotate(337.5)"><path d="M 0,-114 L 4,-109 L 0,-104 L -4,-109 Z"/></g></g><g fill="#7A4418" opacity="0.42"><circle cx="140" cy="47" r="2.5"/><circle cx="174.8" cy="54.1" r="2.5"/><circle cx="204.3" cy="73.7" r="2.5"/><circle cx="223.9" cy="103.2" r="2.5"/><circle cx="231" cy="138" r="2.5"/><circle cx="223.9" cy="172.8" r="2.5"/><circle cx="204.3" cy="202.3" r="2.5"/><circle cx="174.8" cy="221.9" r="2.5"/><circle cx="140" cy="229" r="2.5"/><circle cx="105.2" cy="221.9" r="2.5"/><circle cx="75.7" cy="202.3" r="2.5"/><circle cx="56.1" cy="172.8" r="2.5"/><circle cx="49" cy="138" r="2.5"/><circle cx="56.1" cy="103.2" r="2.5"/><circle cx="75.7" cy="73.7" r="2.5"/><circle cx="105.2" cy="54.1" r="2.5"/></g><circle cx="140" cy="138" r="74" fill="none" stroke="#7A4418" stroke-width="1.4" opacity="0.65"/><circle cx="140" cy="138" r="70" fill="none" stroke="#D8A050" stroke-width="0.6" opacity="0.45"/><g opacity="0.85"><g transform="translate(140,138) rotate(0)"><path d="M 52,0 C 60,-22 80,-46 103,-36 C 116,-18 116,18 103,36 C 80,46 60,22 52,0 Z" fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.9"/></g><g transform="translate(140,138) rotate(45)"><path d="M 52,0 C 60,-22 80,-46 103,-36 C 116,-18 116,18 103,36 C 80,46 60,22 52,0 Z" fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.9"/></g><g transform="translate(140,138) rotate(90)"><path d="M 52,0 C 60,-22 80,-46 103,-36 C 116,-18 116,18 103,36 C 80,46 60,22 52,0 Z" fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.9"/></g><g transform="translate(140,138) rotate(135)"><path d="M 52,0 C 60,-22 80,-46 103,-36 C 116,-18 116,18 103,36 C 80,46 60,22 52,0 Z" fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.9"/></g><g transform="translate(140,138) rotate(180)"><path d="M 52,0 C 60,-22 80,-46 103,-36 C 116,-18 116,18 103,36 C 80,46 60,22 52,0 Z" fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.9"/></g><g transform="translate(140,138) rotate(225)"><path d="M 52,0 C 60,-22 80,-46 103,-36 C 116,-18 116,18 103,36 C 80,46 60,22 52,0 Z" fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.9"/></g><g transform="translate(140,138) rotate(270)"><path d="M 52,0 C 60,-22 80,-46 103,-36 C 116,-18 116,18 103,36 C 80,46 60,22 52,0 Z" fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.9"/></g><g transform="translate(140,138) rotate(315)"><path d="M 52,0 C 60,-22 80,-46 103,-36 C 116,-18 116,18 103,36 C 80,46 60,22 52,0 Z" fill="rgba(55,20,5,0.14)" stroke="#7A4418" stroke-width="0.9"/></g></g><circle cx="140" cy="138" r="43" fill="none" stroke="#7A4418" stroke-width="1.4" opacity="0.7"/><circle cx="140" cy="138" r="39" fill="none" stroke="#D8A050" stroke-width="0.6" opacity="0.45"/><g transform="translate(140,138)" stroke="#7A4418" stroke-width="0.7" opacity="0.5"><line x1="0" y1="-15" x2="0" y2="-39"/><line x1="7.5" y1="-13" x2="19.5" y2="-33.8"/><line x1="13" y1="-7.5" x2="33.8" y2="-19.5"/><line x1="15" y1="0" x2="39" y2="0"/><line x1="13" y1="7.5" x2="33.8" y2="19.5"/><line x1="7.5" y1="13" x2="19.5" y2="33.8"/><line x1="0" y1="15" x2="0" y2="39"/><line x1="-7.5" y1="13" x2="-19.5" y2="33.8"/><line x1="-13" y1="7.5" x2="-33.8" y2="19.5"/><line x1="-15" y1="0" x2="-39" y2="0"/><line x1="-13" y1="-7.5" x2="-33.8" y2="-19.5"/><line x1="-7.5" y1="-13" x2="-19.5" y2="-33.8"/></g><g transform="translate(140,138)" fill="rgba(55,20,5,0.13)" stroke="#7A4418" stroke-width="0.85"><polygon points="0,-28 4.59,-11.09 19.8,-19.8 11.09,-4.59 28,0 11.09,4.59 19.8,19.8 4.59,11.09 0,28 -4.59,11.09 -19.8,19.8 -11.09,4.59 -28,0 -11.09,-4.59 -19.8,-19.8 -4.59,-11.09"/></g><circle cx="140" cy="138" r="13" fill="none" stroke="#7A4418" stroke-width="1.1" opacity="0.7"/><circle cx="140" cy="138" r="7" fill="none" stroke="#7A4418" stroke-width="0.8" opacity="0.6"/><circle cx="140" cy="138" r="2.5" fill="#7A4418" opacity="0.6"/><circle cx="140" cy="138" r="126" fill="url(#sgSh)"/></svg>`;

/* ── Game state ── */
let currentEdition  = null;
let currentCat      = 'soft';
let currentCats     = [];
let currentQuestion = null;
let drawn = 0, round = 1;
let used  = {};
let sessionDrawn = 0;
let sessionFavs  = 0;

/* ── Edition select ── */
window.selectEdition = function(edition) {
  currentEdition = edition;
  const ed = EDITIONS[edition];
  const cats = getEditionCats(edition);
  currentCats = cats;
  currentCat  = cats[0];

  document.getElementById('ed-title').textContent = ed.name;
  document.getElementById('ed-ar').textContent    = ed.ar;
  document.getElementById('ed-badge').innerHTML   = ed.badge;
  document.getElementById('ed-cats').innerHTML    = cats.map(c =>
    `<div class="land-cat-pill">${CATEGORIES[c].sym} ${CATEGORIES[c].en}</div>`).join('');

  const saved    = allProgress[edition];
  const enterBtn = document.getElementById('btn-land-enter');
  const chip     = document.getElementById('land-progress-chip');
  const freshBtn = document.getElementById('btn-start-fresh');
  const barWrap  = document.getElementById('land-progress-bar-wrap');
  const barLabel = document.getElementById('land-progress-label');
  const barFill  = document.getElementById('land-progress-fill');
  const totalQs  = cats.reduce((s, c) => s + (CATEGORIES[c]?.qs.length || 0), 0);
  if (saved && saved.drawn > 0) {
    enterBtn.innerHTML     = '▶ &nbsp; Continue · متابعة';
    enterBtn.onclick       = () => startGame(true);
    chip.textContent       = `Round ${saved.round} · ${saved.drawn} / ${totalQs} drawn`;
    chip.style.display     = 'block';
    freshBtn.style.display = 'block';
    freshBtn.onclick       = () => startGame(false);
    const pct = Math.min(100, Math.round(saved.drawn / totalQs * 100));
    barLabel.textContent   = `${saved.drawn} of ${totalQs} questions explored`;
    barFill.style.width    = pct + '%';
    barWrap.style.display  = 'block';
  } else {
    enterBtn.innerHTML     = '💕 &nbsp; ابدأ — Begin';
    enterBtn.onclick       = () => startGame(false);
    chip.style.display     = 'none';
    freshBtn.style.display = 'none';
    barWrap.style.display  = 'none';
  }

  buildGameInterface(cats);
  transition(() => {
    document.getElementById('edition-select').classList.remove('on');
    document.getElementById('landing').classList.add('on');
  });
};

window.backToEditions = function() {
  transition(() => {
    document.getElementById('landing').classList.remove('on');
    document.getElementById('edition-select').classList.add('on');
  });
};

function buildGameInterface(cats) {
  document.getElementById('cat-strip').innerHTML = cats.map((c, i) => {
    const cat = CATEGORIES[c];
    if (!cat) return '';
    const locked = !isPremium && i >= 2;
    const label  = locked ? `🔒 ${cat.en}` : `${cat.sym} ${cat.en}`;
    const action = locked ? `openUnlockModal()` : `setCat('${c}',this)`;
    return `<button class="cat-btn ${i===0&&!locked?'active':''} ${locked?'cat-locked':''}" data-cat="${c}" onclick="${action}">${label}<span class="cat-progress"></span></button>`;
  }).filter(Boolean).join('');
  const ed = EDITIONS[currentEdition];
  if (ed) document.getElementById('game-edition').textContent = ed.icon + ' ' + ed.name;
}

function updateCatProgress() {
  document.querySelectorAll('.cat-btn[data-cat]').forEach(btn => {
    const c   = btn.dataset.cat;
    const cat = CATEGORIES[c];
    if (!cat) return;
    const total = cat.qs.length;
    const seen  = (used[c] || []).length;
    const span  = btn.querySelector('.cat-progress');
    if (span) span.textContent = seen > 0 ? ` ${seen}/${total}` : '';
    btn.classList.toggle('cat-done', seen > 0 && seen >= total);
  });
}

/* ── Landing → Game ── */
window.startGame = function(shouldContinue = false) {
  const saved = allProgress[currentEdition];
  if (shouldContinue && saved && saved.drawn > 0) {
    drawn      = saved.drawn;
    round      = saved.round;
    used       = JSON.parse(JSON.stringify(saved.used || {}));
    currentCat = saved.currentCat || currentCats[0];
  } else {
    drawn = 0; round = 1; used = {};
    currentCat = currentCats[0];
    if (!shouldContinue) clearEditionProgress(currentEdition);
  }
  sessionDrawn = 0; sessionFavs = 0;
  updateStats();
  startSessionTimer();

  // First-time hint
  if (!localStorage.getItem('seneya_hint')) {
    localStorage.setItem('seneya_hint', '1');
    setTimeout(() => toast('← Draw · → Skip · ♡ Save a question', 3500), 1200);
  }

  transition(() => {
    document.getElementById('landing').classList.remove('on');
    document.getElementById('game').classList.add('on');
    resetWelcomeCard(shouldContinue && saved && saved.drawn > 0);
    if (shouldContinue && saved?.currentCat) {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      const btn = document.querySelector(`.cat-btn[data-cat="${currentCat}"]`);
      if (btn) btn.classList.add('active');
    }
    updateCatProgress();
  });
};

function resetWelcomeCard(isContinue = false) {
  document.getElementById('card-stage').innerHTML = `
    <div class="welcome-card">
      <div class="sineya-tray">${SINEYA_SVG}</div>
      <h3>${isContinue ? 'Welcome back!' : 'Ready for the real talk?'}</h3>
      <p>${isContinue ? 'Pick a category to continue where you left off.' : 'Pick a category above to draw your first card.'}</p>
      <p class="wc-ar">اختار الفئة — الصدق هو القاعدة الوحيدة</p>
    </div>`;
}

/* ── Home ── */
window.askGoHome = function() {
  if (drawn === 0) { doGoHome(); return; }
  document.getElementById('confirm-home').classList.add('open');
};
window.closeConfirmHome = function() {
  document.getElementById('confirm-home').classList.remove('open');
};
window.doGoHome = function() {
  document.getElementById('confirm-home').classList.remove('open');
  clearTimeout(saveTimer);
  persistProgress();
  const sd = sessionDrawn, sf = sessionFavs;
  const elapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
  drawn = 0; round = 1; used = {}; currentEdition = null; currentCat = 'soft'; currentCats = []; currentQuestion = null;
  sessionDrawn = 0; sessionFavs = 0;
  stopSessionTimer(); updateStats();
  endLiveSession();
  transition(() => {
    document.getElementById('game').classList.remove('on');
    document.getElementById('edition-select').classList.add('on');
    updateEditionProgressBadges();
    updateLifetimeDisplay();
    if (sd > 0) showSummary(sd, sf, elapsed);
  });
};

window.randomEdition = function() {
  const keys = Object.keys(EDITIONS);
  const pick = keys[Math.floor(Math.random() * keys.length)];
  selectEdition(pick);
};

function showSummary(drawnCount, favCount, seconds) {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  const timeStr = `${m}:${s.toString().padStart(2,'0')}`;
  const msgs = [
    ['🌷', 'Beautiful session!', 'The best conversations start with honest questions.'],
    ['✨', 'That was real.', "You showed up — that's what matters most."],
    ['💕', 'Keep going!', 'Every card you draw brings you a little closer.'],
    ['🌙', 'Deep talk done.', 'The questions you ask say a lot about who you are.'],
    ['💎', 'Quality time!', "Presence is the rarest gift — you gave it."],
  ];
  const [icon, title, msg] = msgs[Math.floor(Math.random() * msgs.length)];
  document.getElementById('sum-icon').textContent  = icon;
  document.getElementById('sum-title').textContent = title;
  document.getElementById('sum-msg').textContent   = msg;
  document.getElementById('sum-drawn').textContent = drawnCount;
  document.getElementById('sum-time').textContent  = timeStr;
  document.getElementById('sum-favs').textContent  = favCount;
  document.getElementById('session-summary').classList.add('open');
}

window.closeSummary = function() {
  document.getElementById('session-summary').classList.remove('open');
};

/* ── Category ── */
window.setCat = function(cat, el) {
  currentCat = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  updateStats();
  drawCard();
};

/* ── Draw card ── */
function drawCard(count = true) {
  const catData = CATEGORIES[currentCat];
  if (!catData) return;
  const pool = catData.qs;
  const key  = currentCat;
  if (!used[key]) used[key] = [];

  let avail = pool.map((_,i) => i).filter(i => !used[key].includes(i));

  if (avail.length === 0) {
    if (count) { round++; updateStats(); }
    showDoneCard(catData, key);
    scheduleSave(); return;
  }

  const idx = avail[Math.floor(Math.random() * avail.length)];
  used[key].push(idx);
  const q = pool[idx];
  currentQuestion = { en: q.en, ar: q.ar };
  if (count) { drawn++; sessionDrawn++; scheduleSave(); if (navigator.vibrate) navigator.vibrate(8); playDraw(); }
  if (isDealer && liveSessionId) {
    setDoc(doc(db, 'sessions', liveSessionId), {
      currentCard: { en: q.en, ar: q.ar }, cat: key,
      action: 'draw', drawn, round, updatedAt: serverTimestamp()
    }, { merge: true }).catch(() => {});
  }
  updateStats();
  updateCatProgress();

  const seenInCat = used[key].length;
  const isFav = favourites.some(f => f.en === q.en && f.edition === currentEdition);

  document.getElementById('card-stage').innerHTML = `
    <div class="q-card-wrap">
      <div class="q-card ${catData.bgClass}">
        <div class="card-overlay"></div>
        <div class="card-deco tl">🌹</div>
        <div class="card-deco br">🌹</div>
        <div class="card-badge">
          <span class="badge-sym">${catData.sym}</span>
          <span class="badge-en">${catData.en}</span>
          <span class="badge-ar">· ${catData.ar}</span>
        </div>
        <div class="card-body">
          <div class="card-q-en">${q.en}</div>
          <div class="card-divider"></div>
          <div class="card-q-ar">${q.ar}</div>
          ${q.chal ? `<div class="card-challenge"><span class="card-challenge-icon">🎯</span><div class="card-challenge-en">${q.chal.en}</div><div class="card-challenge-ar">${q.chal.ar}</div></div>` : ''}
        </div>
        <div class="card-footer">
          <span class="card-num">${seenInCat}/${pool.length}</span>
          <div class="card-footer-actions">
            <button class="btn-card-action btn-card-fav ${isFav?'fav-active':''}" onclick="toggleFav()" title="Save question">${isFav?'♥':'♡'}</button>
            <button class="btn-card-action btn-card-share" onclick="shareCard()" title="Share">↑</button>
          </div>
        </div>
      </div>
    </div>`;

  document.querySelector('.q-card')?.addEventListener('click', e => {
    if (e.target.closest('.btn-card-action')) return;
    drawCard(true);
  });
}

function showDoneCard(catData, key) {
  const total = catData.qs.length;
  used[key] = [];
  updateCatProgress();
  playDone();
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  currentQuestion = null;
  document.getElementById('card-stage').innerHTML = `
    <div class="done-card">
      <div class="done-card-icon">${catData.sym}</div>
      <div class="done-card-title">All Done! · أتممتم!</div>
      <div class="done-card-sub">You explored all <strong>${total}</strong> questions in<br><strong>${catData.en}</strong></div>
      <div class="done-card-ar">انتهت الأسئلة — جولة جديدة تنتظركم</div>
      <button class="btn-done-continue" onclick="window.drawCard()">Next Round · جولة جديدة 🔁</button>
    </div>`;
}

window.drawCard = () => drawCard(true);

window.skipCard = function() {
  if (navigator.vibrate) navigator.vibrate(4);
  playSkip();
  const card = document.querySelector('.q-card');
  if (card) { card.classList.add('swipe-right'); setTimeout(() => drawCard(false), 290); }
  else drawCard(false);
};

/* ── Swipe ── */
let touchStartX = 0, touchStartY = 0;
document.getElementById('card-stage').addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
document.getElementById('card-stage').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 55 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
  const card = document.querySelector('.q-card');
  if (!card) return;
  if (dx < 0) { card.classList.add('swipe-left');  setTimeout(() => drawCard(true),  290); }
  else         { card.classList.add('swipe-right'); setTimeout(() => drawCard(false), 290); }
}, { passive: true });

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  if (!document.getElementById('game').classList.contains('on')) return;
  if (document.getElementById('confirm-home').classList.contains('open')) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  switch(e.code) {
    case 'Space': case 'ArrowLeft': case 'Enter': e.preventDefault(); drawCard(true);      break;
    case 'ArrowRight':                            e.preventDefault(); window.skipCard();   break;
    case 'KeyF':                                  e.preventDefault(); window.toggleFav();  break;
    case 'KeyS':                                  e.preventDefault(); window.shareCard();  break;
  }
});

/* ── Stats ── */
function updateStats() {
  document.getElementById('s-drawn').textContent    = drawn;
  document.getElementById('s-round').textContent    = round;
  document.getElementById('s-cat').textContent      = CATEGORIES[currentCat]?.statIcon || '💕';
  document.getElementById('s-cat-name').textContent = CAT_SHORT[currentCat] || 'Category';
}

function toast(msg, duration = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}
