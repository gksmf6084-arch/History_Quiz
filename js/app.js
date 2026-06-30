// ========== 한국사 퀴즈 게임 엔진 ==========

// --- 게임 상태 ---
const GameState = {
  screen: 'home',
  round: 1,
  totalPoints: 0,
  roundPoints: 0,
  roundQuestions: [],
  wrongQueue: [],
  answeredCorrectly: new Set(),
  selectedOption: null,
  answered: false,
  currentDisplayedQ: null,
  totalStats: {
    played: 0,
    correct: 0,
    wrong: 0,
  },
  wrongBank: [],
};

// --- 포인트 설정 ---
const POINTS = {
  firstCorrect: 100,
  retriedCorrect: 50,
  wrong: -10,
  roundBonus: 200,
  perfectBonus: 500,
};

// --- 유틸 ---
function showScreen(name) {
  ['screen-home', 'screen-round', 'screen-result'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.remove('hidden');
  GameState.screen = name;
}

function animateValue(el, from, to, duration) {
  duration = duration || 600;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getEl(id) {
  return document.getElementById(id);
}

// --- 홈 화면 초기화 ---
function initHome() {
  const tpEl = getEl('total-points-display');
  const tpHomeEl = getEl('total-points-home');
  if (tpEl) tpEl.textContent = GameState.totalPoints.toLocaleString();
  if (tpHomeEl) animateValue(tpHomeEl, 0, GameState.totalPoints, 800);

  const rdEl = getEl('round-display');
  if (rdEl) rdEl.textContent = GameState.round;

  const spEl = getEl('stats-played');
  const scEl = getEl('stats-correct');
  const swEl = getEl('stats-wrong');
  const saEl = getEl('stats-accuracy');
  if (spEl) spEl.textContent = GameState.totalStats.played;
  if (scEl) scEl.textContent = GameState.totalStats.correct;
  if (swEl) swEl.textContent = GameState.totalStats.wrong;
  const acc = GameState.totalStats.played > 0
    ? Math.round((GameState.totalStats.correct / GameState.totalStats.played) * 100)
    : 0;
  if (saEl) saEl.textContent = acc + '%';

  const wbEl = getEl('wrong-bank-count');
  if (wbEl) wbEl.textContent = GameState.wrongBank.length;
  const retryBtn = getEl('btn-retry-wrong');
  if (retryBtn) retryBtn.disabled = GameState.wrongBank.length === 0;

  showScreen('home');
}

// --- 라운드 시작 ---
function startRound(mode) {
  mode = mode || 'normal';
  GameState.roundPoints = 0;
  GameState.wrongQueue = [];
  GameState.answeredCorrectly = new Set();
  GameState.answered = false;
  GameState.selectedOption = null;
  GameState.currentDisplayedQ = null;

  let pool;
  if (mode === 'wrong' && GameState.wrongBank.length > 0) {
    pool = shuffleArr(GameState.wrongBank).slice(0, QUESTIONS_PER_ROUND);
  } else {
    pool = shuffleArr(QUESTIONS).slice(0, QUESTIONS_PER_ROUND);
  }

  GameState.roundQuestions = pool;

  const rtEl = getEl('round-title');
  if (rtEl) rtEl.textContent = 'Round ' + GameState.round;

  updateRoundHUD();
  showScreen('round');
  showQuestion();
}

// --- HUD 업데이트 ---
function updateRoundHUD() {
  const total = GameState.roundQuestions.length;
  const done = GameState.answeredCorrectly.size;
  const wrongPending = GameState.wrongQueue.filter(wq => !GameState.answeredCorrectly.has(wq.id)).length;
  const remaining = (total - done) + wrongPending;

  const hpEl = getEl('hud-progress');
  const hptsEl = getEl('hud-points');
  const htEl = getEl('hud-total');
  const pbEl = getEl('progress-bar-fill');
  const ppEl = getEl('progress-pct');
  const qcEl = getEl('q-counter');

  if (hpEl) hpEl.textContent = done + ' / ' + total;
  if (hptsEl) hptsEl.textContent = GameState.roundPoints.toLocaleString();
  if (htEl) htEl.textContent = GameState.totalPoints.toLocaleString();

  const pct = total > 0 ? (done / total) * 100 : 0;
  if (pbEl) pbEl.style.width = pct + '%';
  if (ppEl) ppEl.textContent = Math.round(pct) + '%';
  if (qcEl) qcEl.textContent = '남은 문제: ' + remaining + '개';
}

// --- 다음에 풀 문제 가져오기 ---
function getNextQuestion() {
  // 메인 큐에서 아직 못 맞춘 것
  const mainRemaining = GameState.roundQuestions.filter(q => !GameState.answeredCorrectly.has(q.id));
  if (mainRemaining.length > 0) {
    // wrongQueue에 있는 것보다 아직 wrongQueue에 없는 것 먼저
    const notWrong = mainRemaining.filter(q => !GameState.wrongQueue.some(wq => wq.id === q.id));
    if (notWrong.length > 0) return notWrong[0];
    // 모두 틀린 상태면 wrongQueue에서
  }
  // wrongQueue에서 아직 못 맞춘 것
  const wrongPending = GameState.wrongQueue.filter(q => !GameState.answeredCorrectly.has(q.id));
  if (wrongPending.length > 0) return wrongPending[0];
  return null;
}

// --- 문제 표시 ---
function showQuestion() {
  GameState.answered = false;
  GameState.selectedOption = null;

  const q = getNextQuestion();
  if (!q) {
    endRound();
    return;
  }

  GameState.currentDisplayedQ = q;

  const isRetry = GameState.wrongQueue.some(wq => wq.id === q.id);

  // 뱃지
  const badgeEl = getEl('question-badge');
  if (badgeEl) {
    badgeEl.textContent = isRetry ? '🔄 다시 풀기' : q.topic;
    badgeEl.className = 'question-badge' + (isRetry ? ' retry-badge' : '');
  }

  const unitEl = getEl('question-unit');
  if (unitEl) unitEl.textContent = q.unit;

  const textEl = getEl('question-text');
  if (textEl) textEl.innerHTML = q.question.replace(/\n/g, '<br>');

  // 난이도
  const diffEl = getEl('question-diff');
  if (diffEl) {
    diffEl.textContent = q.difficulty;
    diffEl.className = 'diff-badge diff-' + (q.difficulty === '쉬움' ? 'easy' : q.difficulty === '보통' ? 'medium' : 'hard');
  }

  // 선택지
  const optCont = getEl('options-container');
  if (optCont) {
    optCont.innerHTML = '';
    const nums = ['①', '②', '③', '④', '⑤'];
    q.options.forEach(function(opt, idx) {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = '<span class="option-num">' + nums[idx] + '</span><span class="option-text">' + opt + '</span>';
      btn.addEventListener('click', function() { selectOption(idx, q); });
      optCont.appendChild(btn);
    });
  }

  // 해설/다음 버튼 숨기기
  const expPanel = getEl('explanation-panel');
  const nextBtn = getEl('next-btn');
  const showExpBtn = getEl('show-explanation-btn');
  if (expPanel) expPanel.classList.add('hidden');
  if (nextBtn) nextBtn.classList.add('hidden');
  if (showExpBtn) showExpBtn.classList.add('hidden');

  // HUD 업데이트
  updateRoundHUD();

  // 슬라이드 인
  const card = getEl('question-card');
  if (card) {
    card.classList.remove('slide-in');
    void card.offsetWidth;
    card.classList.add('slide-in');
  }
}

// --- 선택지 선택 ---
function selectOption(idx, q) {
  if (GameState.answered) return;
  GameState.answered = true;
  GameState.selectedOption = idx;

  const isRetry = GameState.wrongQueue.some(wq => wq.id === q.id);
  const correct = idx === q.answer;
  const optBtns = document.querySelectorAll('.option-btn');

  optBtns.forEach(function(btn, i) {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    if (i === idx && !correct) btn.classList.add('wrong');
  });

  if (correct) {
    GameState.answeredCorrectly.add(q.id);
    GameState.wrongQueue = GameState.wrongQueue.filter(wq => wq.id !== q.id);

    const pts = isRetry ? POINTS.retriedCorrect : POINTS.firstCorrect;
    GameState.roundPoints += pts;
    GameState.totalPoints += pts;
    GameState.totalStats.correct++;
    showFeedback(true, pts, isRetry);
    triggerCorrectEffect();
  } else {
    GameState.roundPoints = Math.max(0, GameState.roundPoints + POINTS.wrong);
    GameState.totalPoints = Math.max(0, GameState.totalPoints + POINTS.wrong);
    GameState.totalStats.wrong++;

    if (!GameState.wrongQueue.some(wq => wq.id === q.id)) {
      GameState.wrongQueue.push(q);
    }
    if (!GameState.wrongBank.some(wb => wb.id === q.id)) {
      GameState.wrongBank.push(q);
    }
    showFeedback(false, POINTS.wrong, isRetry);
    triggerWrongEffect();
  }

  GameState.totalStats.played++;
  updateRoundHUD();
  saveGame();

  const showExpBtn = getEl('show-explanation-btn');
  const nextBtn = getEl('next-btn');
  if (showExpBtn) showExpBtn.classList.remove('hidden');
  if (nextBtn) nextBtn.classList.remove('hidden');
}

// --- 피드백 팝업 ---
function showFeedback(correct, pts, isRetry) {
  const fb = getEl('feedback-popup');
  if (!fb) return;
  if (correct) {
    fb.className = 'feedback-popup correct-fb';
    fb.innerHTML = isRetry
      ? '✅ 다시 맞췄어요!<br><span class="pts-badge">+' + pts + '점</span>'
      : '🎉 정답!<br><span class="pts-badge">+' + pts + '점</span>';
  } else {
    fb.className = 'feedback-popup wrong-fb';
    fb.innerHTML = '❌ 오답!<br><span class="pts-badge">' + pts + '점</span><br><small>마지막에 다시 나와요!</small>';
  }
  fb.classList.remove('hidden', 'fade-out', 'pop-in');
  void fb.offsetWidth;
  fb.classList.add('pop-in');
  setTimeout(function() {
    fb.classList.add('fade-out');
    setTimeout(function() { fb.classList.add('hidden'); }, 500);
  }, 1800);
}

// --- 이펙트 ---
function triggerCorrectEffect() {
  const el = getEl('effect-layer');
  if (!el) return;
  el.innerHTML = '';
  const emojis = ['🎉', '⭐', '✨', '🌟', '🔥', '💯', '🏆'];
  for (let i = 0; i < 10; i++) {
    const span = document.createElement('span');
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.className = 'particle';
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDelay = (Math.random() * 0.5) + 's';
    span.style.fontSize = (Math.random() * 20 + 16) + 'px';
    el.appendChild(span);
  }
  setTimeout(function() { el.innerHTML = ''; }, 2200);
}

function triggerWrongEffect() {
  const card = getEl('question-card');
  if (!card) return;
  card.classList.add('shake');
  setTimeout(function() { card.classList.remove('shake'); }, 500);
}

// --- 해설 표시 ---
function showExplanation(q) {
  if (!q) return;
  const panel = getEl('explanation-panel');
  if (!panel) return;
  const nums = ['①', '②', '③', '④', '⑤'];
  const correctOptText = q.options[q.answer];
  panel.innerHTML =
    '<div class="explanation-content">' +
    '<div class="exp-header">📖 정답 해설</div>' +
    '<div class="exp-answer">정답: <strong>' + nums[q.answer] + ' ' + correctOptText + '</strong></div>' +
    '<div class="exp-text">' + q.explanation + '</div>' +
    '</div>';
  panel.classList.remove('hidden');
}

// --- 라운드 종료 ---
function endRound() {
  const total = GameState.roundQuestions.length;
  const correct = GameState.answeredCorrectly.size;
  const wrongCount = GameState.wrongQueue.filter(wq =>
    GameState.roundQuestions.some(rq => rq.id === wq.id)
  ).length;
  const isPerfect = wrongCount === 0 && correct === total;

  let bonus = POINTS.roundBonus;
  if (isPerfect) bonus += POINTS.perfectBonus;
  GameState.roundPoints += bonus;
  GameState.totalPoints += bonus;

  // 결과 화면
  const rrEl = getEl('result-round');
  if (rrEl) rrEl.textContent = 'Round ' + GameState.round + ' 완료!';

  const rcEl = getEl('result-correct');
  const rtEl = getEl('result-total');
  const rpEl = getEl('result-pts');
  const rtpEl = getEl('result-total-pts');
  const raEl = getEl('result-accuracy');
  const rgEl = getEl('result-grade');
  const rbEl = getEl('result-bonus');
  const reEl = getEl('result-emoji');

  const accuracy = Math.round((correct / total) * 100);
  if (rcEl) rcEl.textContent = correct;
  if (rtEl) rtEl.textContent = total;
  if (rpEl) rpEl.textContent = GameState.roundPoints.toLocaleString();
  if (rtpEl) rtpEl.textContent = GameState.totalPoints.toLocaleString();
  if (raEl) raEl.textContent = accuracy + '%';

  let grade, emoji;
  if (accuracy === 100) { grade = '🏆 완벽 클리어!'; emoji = '🏆'; }
  else if (accuracy >= 80) { grade = '🌟 훌륭해요!'; emoji = '🎉'; }
  else if (accuracy >= 60) { grade = '👍 잘했어요!'; emoji = '😊'; }
  else { grade = '💪 더 노력해요!'; emoji = '😤'; }

  if (rgEl) rgEl.textContent = grade;
  if (reEl) reEl.textContent = emoji;

  const bonusText = '🎁 라운드 보너스: +' + POINTS.roundBonus + '점' +
    (isPerfect ? ' + 퍼펙트 보너스 +' + POINTS.perfectBonus + '점 🏆' : '');
  if (rbEl) rbEl.textContent = bonusText;

  // 오답 목록
  const wrongListEl = getEl('wrong-list');
  if (wrongListEl) {
    const wrongFromRound = GameState.wrongBank.filter(function(q) {
      return GameState.roundQuestions.some(function(rq) { return rq.id === q.id; });
    });
    if (wrongFromRound.length === 0) {
      wrongListEl.innerHTML = '<p class="no-wrong">🎉 이번 라운드 틀린 문제 없음! 완벽해요!</p>';
    } else {
      wrongListEl.innerHTML = wrongFromRound.map(function(q) {
        const preview = q.question.split('\n')[0];
        return '<div class="wrong-item">' +
          '<div class="wrong-q">' + (preview.length > 55 ? preview.substring(0, 55) + '...' : preview) + '</div>' +
          '<div class="wrong-topic">' + q.topic + '</div>' +
          '</div>';
      }).join('');
    }
  }

  GameState.round++;
  saveGame();
  showScreen('result');
}

// --- 이벤트 등록 (DOMContentLoaded 후) ---
window.addEventListener('DOMContentLoaded', function() {
  // 저장 데이터 불러오기
  try {
    const saved = localStorage.getItem('hanguksa_game');
    if (saved) {
      const data = JSON.parse(saved);
      GameState.totalPoints = data.totalPoints || 0;
      GameState.round = data.round || 1;
      GameState.totalStats = data.totalStats || { played: 0, correct: 0, wrong: 0 };
      GameState.wrongBank = (data.wrongBank || []).map(function(id) {
        return QUESTIONS.find(function(q) { return q.id === id; });
      }).filter(Boolean);
    }
  } catch(e) {}

  // 버튼 이벤트
  const startBtn = getEl('btn-start');
  if (startBtn) startBtn.addEventListener('click', function() { startRound('normal'); });

  const retryWrongBtn = getEl('btn-retry-wrong');
  if (retryWrongBtn) retryWrongBtn.addEventListener('click', function() { startRound('wrong'); });

  const showExpBtn = getEl('show-explanation-btn');
  if (showExpBtn) showExpBtn.addEventListener('click', function() {
    showExplanation(GameState.currentDisplayedQ);
    showExpBtn.classList.add('hidden');
  });

  const nextBtn = getEl('next-btn');
  if (nextBtn) nextBtn.addEventListener('click', function() {
    getEl('explanation-panel') && getEl('explanation-panel').classList.add('hidden');
    showQuestion();
  });

  const nextRoundBtn = getEl('btn-next-round');
  if (nextRoundBtn) nextRoundBtn.addEventListener('click', function() { startRound('normal'); });

  const homeBtn = getEl('btn-home');
  if (homeBtn) homeBtn.addEventListener('click', function() { initHome(); });

  const retryRoundBtn = getEl('btn-retry-round');
  if (retryRoundBtn) retryRoundBtn.addEventListener('click', function() {
    GameState.round = Math.max(1, GameState.round - 1);
    startRound('normal');
  });

  initHome();
});

// --- 저장 ---
function saveGame() {
  try {
    const data = {
      totalPoints: GameState.totalPoints,
      round: GameState.round,
      totalStats: GameState.totalStats,
      wrongBank: GameState.wrongBank.map(function(q) { return q.id; }),
    };
    localStorage.setItem('hanguksa_game', JSON.stringify(data));
  } catch(e) {}
}

setInterval(saveGame, 5000);
window.addEventListener('beforeunload', saveGame);

// --- 게임 초기화 ---
function resetGame() {
  if (!confirm('정말 초기화할까요?\n포인트, 통계, 오답 보관함이 모두 삭제됩니다.')) return;
  localStorage.removeItem('hanguksa_game');
  GameState.totalPoints = 0;
  GameState.round = 1;
  GameState.totalStats = { played: 0, correct: 0, wrong: 0 };
  GameState.wrongBank = [];
  GameState.roundQuestions = [];
  GameState.wrongQueue = [];
  GameState.answeredCorrectly = new Set();
  initHome();
}

document.addEventListener('DOMContentLoaded', function() {
  const resetBtn = getEl('btn-reset');
  if (resetBtn) resetBtn.addEventListener('click', resetGame);
});
