/* ============================================
   🏗️ Crane Game - Game Logic
   ============================================ */

(function () {
  'use strict';

  // --- Configuration ---
  const CONFIG = {
    maxAttempts: 3,
    craneSpeed: 1.8,           // pixels per frame for horizontal movement
    descendSpeed: 3,           // pixels per frame for descent
    ascendSpeed: 2,            // pixels per frame for ascent
    grabZoneRadius: 60,        // how close the claw center must be to a prize center
    grabSuccessRate: 1.0,      // always succeed when in range
    dropChance: 0,             // no dropping during ascent
    prizes: ['🧸', '🎀', '🌟', '⭐', '🎪', '🎨', '🎵', '🎯'],
    prizeCount: 7,
    craneMinX: 55,             // min X in px (avoid prize chute)
    // craneMaxX set dynamically based on machine width
  };

  // --- Game State ---
  let state = {
    phase: 'waiting',          // waiting | moving | descending | grabbing | ascending | returning | done
    attemptsLeft: CONFIG.maxAttempts,
    collectedPrizes: [],
    craneX: 100,               // current crane X position (px from left of rail)
    craneDirection: 1,         // 1 = right, -1 = left
    clawY: 0,                  // how far the claw has descended
    maxDescend: 0,             // max descent distance
    grabbedPrize: null,        // prize element currently grabbed
    animFrameId: null,
    prizes: [],                // { el, x, y, emoji, grabbed }
  };

  // --- DOM References ---
  const els = {};

  // --- Initialize ---
  function init() {
    cacheDom();
    setupEventListeners();
    generatePrizes();
    updateUI();
  }

  function cacheDom() {
    els.machine = document.getElementById('craneMachine');
    els.rail = document.getElementById('craneRail');
    els.assembly = document.getElementById('craneAssembly');
    els.wire = document.getElementById('craneWire');
    els.clawContainer = document.getElementById('craneClawContainer');
    els.claw = document.getElementById('craneClaw');
    els.playArea = document.getElementById('playArea');
    els.grabBtn = document.getElementById('grabBtn');
    els.attemptsLeft = document.getElementById('attemptsLeft');
    els.collectedPrizes = document.getElementById('collectedPrizes');
    els.instructionsOverlay = document.getElementById('instructionsOverlay');
    els.startBtn = document.getElementById('startBtn');
    els.resultOverlay = document.getElementById('resultOverlay');
    els.resultIcon = document.getElementById('resultIcon');
    els.resultTitle = document.getElementById('resultTitle');
    els.resultMessage = document.getElementById('resultMessage');
    els.resultPrizes = document.getElementById('resultPrizes');
    els.resultBackBtn = document.getElementById('resultBackBtn');
    els.retryBtn = document.getElementById('retryBtn');
  }

  function setupEventListeners() {
    els.startBtn.addEventListener('click', startGame);

    // Grab button - both touch and click
    els.grabBtn.addEventListener('click', handleGrab);
    els.grabBtn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      handleGrab();
    }, { passive: false });

    els.resultBackBtn.addEventListener('click', function () {
      navigateTo('../index.html');
    });

    els.retryBtn.addEventListener('click', resetGame);
  }

  // --- Prize Generation ---
  function generatePrizes() {
    els.playArea.innerHTML = '';
    state.prizes = [];

    const areaRect = els.playArea.getBoundingClientRect();
    const machineRect = els.machine.getBoundingClientRect();

    const areaWidth = areaRect.width;
    const areaHeight = areaRect.height;

    // Calculate available area (avoid prize chute on the left ~50px)
    const minX = 55;
    const maxX = areaWidth - 35;
    const minY = 10;
    const maxY = areaHeight - 35;

    const shuffledPrizes = [...CONFIG.prizes].sort(() => Math.random() - 0.5);
    const count = Math.min(CONFIG.prizeCount, shuffledPrizes.length);

    for (let i = 0; i < count; i++) {
      const emoji = shuffledPrizes[i];

      // Spread prizes more evenly across the area
      const sectionWidth = (maxX - minX) / count;
      const x = minX + sectionWidth * i + Math.random() * (sectionWidth * 0.6);
      const y = minY + Math.random() * (maxY - minY);
      const rotation = (Math.random() - 0.5) * 30; // -15 to +15 degrees

      const el = document.createElement('div');
      el.className = 'prize-item';
      el.textContent = emoji;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.transform = `rotate(${rotation}deg)`;

      els.playArea.appendChild(el);

      state.prizes.push({
        el: el,
        x: x,
        y: y,
        emoji: emoji,
        grabbed: false,
        width: 30,
        height: 30,
      });
    }

    // Add crane shadow
    const shadow = document.createElement('div');
    shadow.className = 'crane-shadow';
    shadow.id = 'craneShadow';
    els.playArea.appendChild(shadow);
    els.craneShadow = shadow;
  }

  // --- Game Start ---
  function startGame() {
    els.instructionsOverlay.classList.add('hidden');
    state.phase = 'moving';
    els.grabBtn.disabled = false;
    startCraneMovement();
  }

  // --- Crane Movement ---
  function startCraneMovement() {
    const machineRect = els.machine.getBoundingClientRect();
    const railWidth = machineRect.width - 16; // account for padding
    const assemblyWidth = 50;
    const maxX = railWidth - assemblyWidth;

    function animate() {
      if (state.phase !== 'moving') return;

      state.craneX += CONFIG.craneSpeed * state.craneDirection;

      // Bounce at boundaries
      if (state.craneX >= maxX) {
        state.craneX = maxX;
        state.craneDirection = -1;
      } else if (state.craneX <= CONFIG.craneMinX) {
        state.craneX = CONFIG.craneMinX;
        state.craneDirection = 1;
      }

      els.assembly.style.transform = `translateX(${state.craneX}px)`;

      // Update shadow position
      if (els.craneShadow) {
        els.craneShadow.style.left = (state.craneX + 10) + 'px';
      }

      state.animFrameId = requestAnimationFrame(animate);
    }

    state.animFrameId = requestAnimationFrame(animate);
  }

  // --- Handle Grab ---
  function handleGrab() {
    if (state.phase !== 'moving') return;
    if (state.attemptsLeft <= 0) return;

    vibrate(30);

    state.phase = 'descending';
    els.grabBtn.disabled = true;
    state.attemptsLeft--;
    updateUI();

    // Cancel horizontal movement
    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
    }

    // Calculate descent
    const machineRect = els.machine.getBoundingClientRect();
    const playAreaRect = els.playArea.getBoundingClientRect();
    const railBottom = els.rail.getBoundingClientRect().bottom;

    // Calculate descent distance: from rail bottom to near the bottom of play area
    const maxDescend = playAreaRect.bottom - railBottom - 30;
    state.maxDescend = maxDescend;
    state.clawY = 0;

    descendCrane();
  }

  // --- Crane Descent ---
  function descendCrane() {
    function animate() {
      if (state.phase !== 'descending') return;

      state.clawY += CONFIG.descendSpeed;

      if (state.clawY >= state.maxDescend) {
        state.clawY = state.maxDescend;
        updateClawPosition();
        state.phase = 'grabbing';
        performGrab();
        return;
      }

      updateClawPosition();
      state.animFrameId = requestAnimationFrame(animate);
    }

    state.animFrameId = requestAnimationFrame(animate);
  }

  // --- Update Claw Visual Position ---
  function updateClawPosition() {
    const wireBaseHeight = 30;
    els.wire.style.height = (wireBaseHeight + state.clawY) + 'px';
    els.clawContainer.style.top = (22 + state.clawY) + 'px';
  }

  // --- Perform Grab (check for prizes) ---
  function performGrab() {
    // Close the claw
    els.claw.classList.add('claw-closed', 'claw-grabbing');
    vibrate([20, 50, 20]);

    // Claw中心位置をplayArea座標系で計算
    const playAreaRect = els.playArea.getBoundingClientRect();
    const railRect     = els.rail.getBoundingClientRect();

    // craneX: assemblyのoffset。クローは assemblyの中心（25px）にある
    const clawCenterX = (state.craneX + 25) - (railRect.left - playAreaRect.left);
    // rail底部からの降下量 + 先端オフセット
    const railBottomInPlayArea = railRect.bottom - playAreaRect.top;
    const clawCenterY = railBottomInPlayArea + state.clawY + 18;

    // 最も近い景品を探す
    let closestPrize = null;
    let closestDist  = Infinity;

    state.prizes.forEach(prize => {
      if (prize.grabbed) return;
      const prizeCenterX = prize.x + prize.width  / 2;
      const prizeCenterY = prize.y + prize.height / 2;
      const dist = Math.hypot(clawCenterX - prizeCenterX, clawCenterY - prizeCenterY);
      if (dist < CONFIG.grabZoneRadius && dist < closestDist) {
        closestDist  = dist;
        closestPrize = prize;
      }
    });

    // 掴み処理
    let grabbed = false;
    if (closestPrize && Math.random() < CONFIG.grabSuccessRate) {
      grabbed = true;
      state.grabbedPrize = closestPrize;
      closestPrize.grabbed = true;

      // 景品を craneClaw の子要素に移動 → クローの動きに自動追従
      closestPrize.el.classList.add('prize-grabbed');
      closestPrize.el.style.position = 'absolute';
      closestPrize.el.style.left     = '-12px';   // claw内での相対位置（横中心）
      closestPrize.el.style.top      = '30px';    // clawの先端直下
      closestPrize.el.style.transform = 'rotate(0deg)';
      closestPrize.el.style.zIndex   = '20';
      closestPrize.el.style.fontSize = '1.8rem';
      els.claw.appendChild(closestPrize.el); // 親要素変更 ← これが追従のポイント
    }

    // 少し待って上昇
    setTimeout(() => {
      state.phase = 'ascending';
      ascendCrane(grabbed);
    }, 500);
  }

  // --- Crane Ascent ---
  function ascendCrane(hasPrize) {
    function animate() {
      if (state.phase !== 'ascending') return;

      state.clawY -= CONFIG.ascendSpeed;

      if (state.clawY <= 0) {
        state.clawY = 0;
        updateClawPosition();
        if (hasPrize) {
          deliverPrize();
        } else {
          finishAttempt();
        }
        return;
      }

      updateClawPosition();
      // 景品は craneClaw の子要素なので位置更新不要—自動追従する

      state.animFrameId = requestAnimationFrame(animate);
    }

    state.animFrameId = requestAnimationFrame(animate);
  }

  // --- Drop Prize (failed hold) ---
  function dropPrize() {
    if (!state.grabbedPrize) return;

    state.grabbedPrize.el.classList.add('prize-dropping');
    state.grabbedPrize.grabbed = false;

    setTimeout(() => {
      // Reset prize position
      state.grabbedPrize.el.classList.remove('prize-grabbed', 'prize-dropping');
      state.grabbedPrize.el.style.position = 'absolute';
      state.grabbedPrize.el.style.left = state.grabbedPrize.x + 'px';
      state.grabbedPrize.el.style.top = state.grabbedPrize.y + 'px';
      state.grabbedPrize.el.style.zIndex = '2';
      state.grabbedPrize.el.style.opacity = '1';
      state.grabbedPrize.el.style.transform = `rotate(${(Math.random() - 0.5) * 30}deg)`;
      state.grabbedPrize = null;
    }, 800);

    state.grabbedPrize = null;
  }

  // --- Deliver Prize Successfully ---
  function deliverPrize() {
    if (!state.grabbedPrize) {
      finishAttempt();
      return;
    }

    const prize = state.grabbedPrize;
    state.collectedPrizes.push(prize.emoji);
    vibrate([50, 30, 50, 30, 100]);

    // 景品を playArea に戻して落下アニメを再生
    prize.el.style.position  = 'absolute';
    prize.el.style.left      = prize.x + 'px';
    prize.el.style.top       = prize.y + 'px';
    prize.el.style.zIndex    = '20';
    prize.el.style.transform = 'rotate(0deg)';
    els.playArea.appendChild(prize.el);  // playArea に戻す
    prize.el.classList.add('prize-dropping');

    setTimeout(() => {
      prize.el.remove();
      updateCollectedDisplay();
      state.grabbedPrize = null;
      finishAttempt();
    }, 600);
  }

  // --- Finish Single Attempt ---
  function finishAttempt() {
    // Open claw
    els.claw.classList.remove('claw-closed', 'claw-grabbing');

    // Reset wire
    state.clawY = 0;
    updateClawPosition();

    if (state.attemptsLeft <= 0) {
      // Game over
      setTimeout(showResults, 600);
      return;
    }

    // Resume crane movement
    setTimeout(() => {
      state.phase = 'moving';
      els.grabBtn.disabled = false;
      startCraneMovement();
    }, 400);
  }

  // --- Show Results ---
  function showResults() {
    state.phase = 'done';
    els.grabBtn.disabled = true;
    els.machine.classList.add('game-over');

    const isWin = state.collectedPrizes.length > 0;

    if (isWin) {
      // CLEAR!
      StampManager.addStamp('crane');
      showConfetti(4000, 80);
      vibrate([100, 50, 100, 50, 200]);

      els.resultIcon.textContent = '🎉';
      els.resultTitle.textContent = 'クリア！';
      els.resultTitle.style.background = 'linear-gradient(135deg, var(--neon-green), var(--neon-cyan))';
      els.resultTitle.style.webkitBackgroundClip = 'text';
      els.resultTitle.style.webkitTextFillColor = 'transparent';
      els.resultTitle.style.backgroundClip = 'text';
      els.resultMessage.textContent = `${state.collectedPrizes.length}つの景品をゲットしました！🎊`;

      // Show collected prizes
      els.resultPrizes.innerHTML = '';
      state.collectedPrizes.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'collected-prize-item';
        span.textContent = emoji;
        els.resultPrizes.appendChild(span);
      });
    } else {
      // Failed
      vibrate(200);

      els.resultIcon.textContent = '😢';
      els.resultTitle.textContent = '残念…';
      els.resultTitle.style.background = 'linear-gradient(135deg, var(--neon-pink), var(--neon-orange))';
      els.resultTitle.style.webkitBackgroundClip = 'text';
      els.resultTitle.style.webkitTextFillColor = 'transparent';
      els.resultTitle.style.backgroundClip = 'text';
      els.resultMessage.textContent = '景品をゲットできませんでした。\nもう一度チャレンジしよう！';
      els.resultPrizes.innerHTML = '';
    }

    els.resultOverlay.classList.remove('hidden');
  }

  // --- Reset Game ---
  function resetGame() {
    // Cancel any running animation
    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
    }

    // Reset state
    state.phase = 'waiting';
    state.attemptsLeft = CONFIG.maxAttempts;
    state.collectedPrizes = [];
    state.craneX = 100;
    state.craneDirection = 1;
    state.clawY = 0;
    state.grabbedPrize = null;

    // Reset visuals
    els.claw.classList.remove('claw-closed', 'claw-grabbing');
    els.machine.classList.remove('game-over');
    els.assembly.style.transform = `translateX(${state.craneX}px)`;
    updateClawPosition();

    // Regenerate prizes
    generatePrizes();

    // Update UI
    updateUI();
    updateCollectedDisplay();

    // Hide result, show instructions briefly then start
    els.resultOverlay.classList.add('hidden');

    // Start the game directly (skip instructions on replay)
    state.phase = 'moving';
    els.grabBtn.disabled = false;
    startCraneMovement();
  }

  // --- Update UI ---
  function updateUI() {
    els.attemptsLeft.textContent = state.attemptsLeft;
  }

  function updateCollectedDisplay() {
    els.collectedPrizes.innerHTML = '';

    if (state.collectedPrizes.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'collected-empty';
      empty.textContent = 'まだ景品がありません';
      els.collectedPrizes.appendChild(empty);
    } else {
      state.collectedPrizes.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'collected-prize-item';
        span.textContent = emoji;
        els.collectedPrizes.appendChild(span);
      });
    }
  }

  // --- Check for already completed ---
  function checkAlreadyCompleted() {
    if (StampManager.isCompleted('crane')) {
      // Still allow playing, but show a note
      const note = document.createElement('p');
      note.style.cssText = 'color: var(--neon-green); font-size: 0.85rem; margin-top: 8px;';
      note.textContent = '✅ クリア済み - もう一度遊べます！';
      const modalContent = els.instructionsOverlay.querySelector('.modal-content');
      modalContent.querySelector('.modal-subtitle').appendChild(note);
    }
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', function () {
    init();
    checkAlreadyCompleted();
  });

})();
