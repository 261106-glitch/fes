/* ============================================
   🎳 Bowling Game - Complete Game Logic
   ============================================ */

(function () {
  'use strict';

  // ==========================================
  // Constants & Configuration
  // ==========================================
  const CLEAR_THRESHOLD = 7;
  const MAX_THROWS = 2;
  const TOTAL_PINS = 10;
  const PIN_RADIUS = 12;
  const BALL_RADIUS = 16;
  const BALL_MAX_SPEED = 18;
  const BALL_MIN_SPEED = 6;
  const PIN_FRICTION = 0.94;
  const PIN_KNOCKED_THRESHOLD = 18; // distance from origin to count as knocked
  const PIN_COLLISION_BOUNCE = 0.6;
  const BALL_FRICTION = 0.995;
  const GUTTER_WIDTH_RATIO = 0.12;
  const LANE_TOP_MARGIN = 0.08;
  const LANE_BOTTOM_MARGIN = 0.12;
  const PIN_AREA_TOP = 0.15;
  const PIN_SPACING_X = 32;
  const PIN_SPACING_Y = 28;

  // ==========================================
  // State
  // ==========================================
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  let W, H, dpr;
  let laneLeft, laneRight, laneWidth;
  let gutterLeftEnd, gutterRightStart;

  let pins = [];
  let ball = null;
  let ballTrail = [];
  let throwCount = 0;
  let totalKnocked = 0;
  let firstThrowKnocked = 0;
  let gameState = 'waiting'; // waiting, aiming, rolling, settling, done
  let swipeStart = null;
  let swipeEnd = null;
  let animFrameId = null;
  let settleTimer = 0;

  // Guide arrow animation
  let guideArrowAnim = 0;

  // UI Elements
  const instructionOverlay = document.getElementById('instructionOverlay');
  const resultOverlay = document.getElementById('resultOverlay');
  const startBtn = document.getElementById('startBtn');
  const retryBtn = document.getElementById('retryBtn');
  const rallyBtn = document.getElementById('rallyBtn');
  const throwDisplay = document.getElementById('throwDisplay');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultSubtitle = document.getElementById('resultSubtitle');
  const resultScore = document.getElementById('resultScore');
  const backBtn = document.getElementById('backBtn');

  // ==========================================
  // Initialization
  // ==========================================
  function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCanvas, 100);
    });

    // Touch events
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // Mouse events (for desktop testing)
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    // Buttons
    startBtn.addEventListener('click', startGame);
    retryBtn.addEventListener('click', restartGame);
    rallyBtn.addEventListener('click', () => navigateTo('../index.html'));
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('../index.html');
    });

    // Start render loop
    render();
  }

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Recalculate lane geometry
    const gutterW = W * GUTTER_WIDTH_RATIO;
    laneLeft = gutterW;
    laneRight = W - gutterW;
    laneWidth = laneRight - laneLeft;
    gutterLeftEnd = laneLeft;
    gutterRightStart = laneRight;

    // Reposition pins and ball if already placed
    if (pins.length > 0) {
      resetPinsAndBall();
    }
  }

  // ==========================================
  // Game Setup
  // ==========================================
  function startGame() {
    instructionOverlay.classList.add('hidden');
    resetGame();
  }

  function restartGame() {
    resultOverlay.classList.add('hidden');
    resetGame();
  }

  function resetGame() {
    throwCount = 0;
    totalKnocked = 0;
    firstThrowKnocked = 0;
    gameState = 'waiting';
    ballTrail = [];
    updateHUD();
    resetPinsAndBall();
  }

  function resetPinsAndBall() {
    createPins();
    createBall();
  }

  function createPins() {
    pins = [];
    const centerX = W / 2;
    const startY = H * PIN_AREA_TOP + 30;

    // Standard 10-pin triangle formation (from front to back)
    // Row 0 (closest to player): 1 pin
    // Row 1: 2 pins
    // Row 2: 3 pins
    // Row 3: 4 pins
    // But in bowling, pins are arranged top-down from headpin perspective
    // Since top-down view with pins at top of screen:
    // Back row (4 pins) at the top, head pin at bottom of formation

    const formation = [
      // Row 0 (back row - 4 pins)
      { row: 0, col: -1.5 }, { row: 0, col: -0.5 }, { row: 0, col: 0.5 }, { row: 0, col: 1.5 },
      // Row 1 (3 pins)
      { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 },
      // Row 2 (2 pins)
      { row: 2, col: -0.5 }, { row: 2, col: 0.5 },
      // Row 3 (head pin)
      { row: 3, col: 0 }
    ];

    formation.forEach((pos, i) => {
      const px = centerX + pos.col * PIN_SPACING_X;
      const py = startY + pos.row * PIN_SPACING_Y;
      pins.push({
        id: i,
        x: px,
        y: py,
        originX: px,
        originY: py,
        vx: 0,
        vy: 0,
        knocked: false,
        radius: PIN_RADIUS,
        rotation: 0,
        opacity: 1
      });
    });

    // If we're on second throw, mark first-throw knocked pins
    if (throwCount === 1) {
      // Keep only standing pins from first throw memory
      // This is handled by the previous throw logic
    }
  }

  function createBall() {
    ball = {
      x: W / 2,
      y: H - H * LANE_BOTTOM_MARGIN - BALL_RADIUS - 20,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      rolling: false,
      rotation: 0
    };
  }

  // ==========================================
  // Input Handling
  // ==========================================
  function getPos(e) {
    if (e.touches) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (gameState !== 'waiting') return;
    const pos = getPos(e);
    swipeStart = { x: pos.x, y: pos.y, time: Date.now() };
    swipeEnd = null;
    gameState = 'aiming';
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (gameState !== 'aiming') return;
    swipeEnd = getPos(e);
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (gameState !== 'aiming') return;
    if (!swipeEnd) {
      gameState = 'waiting';
      return;
    }
    processSwipe();
  }

  function onMouseDown(e) {
    if (gameState !== 'waiting') return;
    swipeStart = { x: e.clientX, y: e.clientY, time: Date.now() };
    swipeEnd = null;
    gameState = 'aiming';
  }

  function onMouseMove(e) {
    if (gameState !== 'aiming') return;
    swipeEnd = { x: e.clientX, y: e.clientY };
  }

  function onMouseUp(e) {
    if (gameState !== 'aiming') return;
    if (!swipeEnd) {
      gameState = 'waiting';
      return;
    }
    processSwipe();
  }

  function processSwipe() {
    const dx = swipeEnd.x - swipeStart.x;
    const dy = swipeEnd.y - swipeStart.y;
    const dt = Math.max(Date.now() - swipeStart.time, 50);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Must swipe upward a minimum distance
    if (dy > -30 || dist < 40) {
      gameState = 'waiting';
      return;
    }

    // Calculate speed from swipe velocity
    const velocity = dist / dt * 10;
    let speed = Math.min(Math.max(velocity, BALL_MIN_SPEED), BALL_MAX_SPEED);

    // Direction
    const angle = Math.atan2(dy, dx);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.rolling = true;
    ballTrail = [];

    gameState = 'rolling';
    vibrate(30);
  }

  // ==========================================
  // Physics & Collision
  // ==========================================
  function updatePhysics() {
    if (gameState !== 'rolling' && gameState !== 'settling') return;

    // Update ball
    if (ball.rolling) {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= BALL_FRICTION;
      ball.vy *= BALL_FRICTION;
      ball.rotation += Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 0.1;

      // Ball trail
      ballTrail.push({ x: ball.x, y: ball.y, opacity: 1 });
      if (ballTrail.length > 20) ballTrail.shift();

      // Gutter check - ball bounces off gutter walls (or gets slowed in gutter)
      if (ball.x - ball.radius < laneLeft) {
        ball.x = laneLeft + ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.3;
        // Ball in gutter - slow it dramatically
        ball.vx *= 0.5;
      }
      if (ball.x + ball.radius > laneRight) {
        ball.x = laneRight - ball.radius;
        ball.vx = -Math.abs(ball.vx) * 0.3;
        ball.vx *= 0.5;
      }

      // Ball goes off screen top or stops
      const totalVelocity = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (ball.y < -50 || ball.y > H + 50 || totalVelocity < 0.3) {
        ball.rolling = false;
        gameState = 'settling';
        settleTimer = 0;
      }

      // Ball-pin collisions
      pins.forEach(pin => {
        if (pin.knocked && pin.opacity <= 0) return;
        const pdx = pin.x - ball.x;
        const pdy = pin.y - ball.y;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        const minDist = ball.radius + pin.radius;

        if (pDist < minDist && pDist > 0) {
          // Collision!
          const nx = pdx / pDist;
          const ny = pdy / pDist;

          // Push pin away
          const relVx = ball.vx - pin.vx;
          const relVy = ball.vy - pin.vy;
          const relVDotN = relVx * nx + relVy * ny;

          if (relVDotN > 0) {
            const impulse = relVDotN * 1.5;
            pin.vx += nx * impulse;
            pin.vy += ny * impulse;

            // Slow ball slightly
            ball.vx -= nx * impulse * 0.3;
            ball.vy -= ny * impulse * 0.3;
          }

          // Separate overlapping
          const overlap = minDist - pDist;
          pin.x += nx * overlap * 0.7;
          pin.y += ny * overlap * 0.7;
          ball.x -= nx * overlap * 0.3;
          ball.y -= ny * overlap * 0.3;

          vibrate(15);
        }
      });
    }

    // Update pins
    pins.forEach(pin => {
      if (pin.knocked && pin.opacity <= 0) return;

      pin.x += pin.vx;
      pin.y += pin.vy;
      pin.vx *= PIN_FRICTION;
      pin.vy *= PIN_FRICTION;
      pin.rotation += (pin.vx + pin.vy) * 0.05;

      // Pin-pin collisions
      pins.forEach(other => {
        if (other.id === pin.id) return;
        if (other.knocked && other.opacity <= 0) return;

        const pdx = other.x - pin.x;
        const pdy = other.y - pin.y;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        const minDist = pin.radius + other.radius;

        if (pDist < minDist && pDist > 0) {
          const nx = pdx / pDist;
          const ny = pdy / pDist;

          const relVx = pin.vx - other.vx;
          const relVy = pin.vy - other.vy;
          const relVDotN = relVx * nx + relVy * ny;

          if (relVDotN > 0) {
            const impulse = relVDotN * PIN_COLLISION_BOUNCE;
            pin.vx -= nx * impulse;
            pin.vy -= ny * impulse;
            other.vx += nx * impulse;
            other.vy += ny * impulse;
          }

          // Separate
          const overlap = minDist - pDist;
          pin.x -= nx * overlap * 0.5;
          pin.y -= ny * overlap * 0.5;
          other.x += nx * overlap * 0.5;
          other.y += ny * overlap * 0.5;
        }
      });

      // Check if knocked down
      const distFromOrigin = Math.sqrt(
        (pin.x - pin.originX) ** 2 + (pin.y - pin.originY) ** 2
      );
      if (distFromOrigin > PIN_KNOCKED_THRESHOLD && !pin.knocked) {
        pin.knocked = true;
      }

      // Fade out knocked pins
      if (pin.knocked) {
        pin.opacity = Math.max(0, pin.opacity - 0.02);
      }

      // Keep pins on screen roughly
      if (pin.x < 0) { pin.x = 0; pin.vx *= -0.3; }
      if (pin.x > W) { pin.x = W; pin.vx *= -0.3; }
      if (pin.y < -30) { pin.y = -30; pin.vy *= -0.3; }
      if (pin.y > H + 30) { pin.y = H + 30; pin.vy *= -0.3; }
    });

    // Settling state - wait for all motion to stop
    if (gameState === 'settling') {
      settleTimer++;
      const allStopped = pins.every(pin => {
        const vel = Math.sqrt(pin.vx * pin.vx + pin.vy * pin.vy);
        return vel < 0.2 || (pin.knocked && pin.opacity <= 0);
      });

      if (allStopped || settleTimer > 180) {
        endThrow();
      }
    }
  }

  function endThrow() {
    // Count how many pins are knocked in this throw
    const knockedThisThrow = pins.filter(p => p.knocked).length;

    if (throwCount === 0) {
      // 1投目：倒れたピン数を記録
      firstThrowKnocked = knockedThisThrow;
      totalKnocked = knockedThisThrow;
    } else {
      // 2投目：残りピンのうち倒れた数を1投目の合計に加算
      // （2投目開始時にpinsは残存ピンのみにリセットされているので
      //   knockedThisThrow = 2投目で倒した数）
      totalKnocked = firstThrowKnocked + knockedThisThrow;
    }

    throwCount++;
    updateHUD();

    // 1投目でストライク（全ピン倒した）か、2投が終わったらゲーム終了
    if (totalKnocked >= TOTAL_PINS || throwCount >= MAX_THROWS) {
      gameState = 'done';
      setTimeout(showResult, 600);
    } else {
      // 2投目へ：倒れたピンを除いた残存ピンで続行
      gameState = 'waiting';
      pins = pins.filter(p => !p.knocked);
      createBall();
      ballTrail = [];
    }
  }

  // ==========================================
  // HUD Update
  // ==========================================
  function updateHUD() {
    const displayThrow = Math.min(throwCount + 1, MAX_THROWS);
    throwDisplay.textContent = `${displayThrow} / ${MAX_THROWS}`;
    scoreDisplay.textContent = totalKnocked;
    scoreDisplay.classList.remove('score-flash');
    void scoreDisplay.offsetWidth; // Force reflow
    scoreDisplay.classList.add('score-flash');
  }

  // ==========================================
  // Result
  // ==========================================
  function showResult() {
    const cleared = totalKnocked >= CLEAR_THRESHOLD;

    if (cleared) {
      resultIcon.textContent = '🎉';
      resultTitle.textContent = totalKnocked >= TOTAL_PINS ? 'ストライク！！' : 'クリア！';
      resultSubtitle.textContent = totalKnocked >= TOTAL_PINS
        ? '全ピン倒した！すごい！🎳'
        : `${TOTAL_PINS}本中 ${totalKnocked}本 倒した！`;
      resultScore.textContent = totalKnocked;

      // Award stamp
      StampManager.addStamp('bowling');
      showConfetti(3000, 80);
      vibrate([100, 50, 100, 50, 200]);
    } else {
      resultIcon.textContent = '😢';
      resultTitle.textContent = 'おしい！';
      resultSubtitle.textContent = `${totalKnocked}本しか倒せなかった… ${CLEAR_THRESHOLD}本以上でクリア！`;
      resultScore.textContent = totalKnocked;
      vibrate(100);
    }

    resultOverlay.classList.remove('hidden');
  }

  // ==========================================
  // Rendering
  // ==========================================
  function render() {
    ctx.clearRect(0, 0, W, H);
    guideArrowAnim += 0.03;

    drawLane();
    drawBallTrail();
    drawPins();
    drawBall();
    drawSwipeGuide();

    updatePhysics();

    // Update trail opacities
    ballTrail.forEach(t => { t.opacity -= 0.05; });
    ballTrail = ballTrail.filter(t => t.opacity > 0);

    animFrameId = requestAnimationFrame(render);
  }

  function drawLane() {
    // Background (dark area beyond lane)
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);

    // Gutters
    const gutterGrad = ctx.createLinearGradient(0, 0, gutterLeftEnd, 0);
    gutterGrad.addColorStop(0, '#0d0d1a');
    gutterGrad.addColorStop(1, '#15152a');
    ctx.fillStyle = gutterGrad;
    ctx.fillRect(0, 0, gutterLeftEnd, H);

    const gutterGrad2 = ctx.createLinearGradient(gutterRightStart, 0, W, 0);
    gutterGrad2.addColorStop(0, '#15152a');
    gutterGrad2.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = gutterGrad2;
    ctx.fillRect(gutterRightStart, 0, W - gutterRightStart, H);

    // Lane surface (wood-like gradient)
    const laneGrad = ctx.createLinearGradient(laneLeft, 0, laneRight, 0);
    laneGrad.addColorStop(0, '#3d2b1f');
    laneGrad.addColorStop(0.1, '#5c3d2e');
    laneGrad.addColorStop(0.3, '#6b4830');
    laneGrad.addColorStop(0.5, '#7a5535');
    laneGrad.addColorStop(0.7, '#6b4830');
    laneGrad.addColorStop(0.9, '#5c3d2e');
    laneGrad.addColorStop(1, '#3d2b1f');
    ctx.fillStyle = laneGrad;
    ctx.fillRect(laneLeft, 0, laneWidth, H);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    const boardWidth = laneWidth / 8;
    for (let i = 1; i < 8; i++) {
      const x = laneLeft + i * boardWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Lane edge highlights
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(laneLeft, 0);
    ctx.lineTo(laneLeft, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(laneRight, 0);
    ctx.lineTo(laneRight, H);
    ctx.stroke();

    // Foul line
    const foulLineY = H * 0.7;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(laneLeft + 5, foulLineY);
    ctx.lineTo(laneRight - 5, foulLineY);
    ctx.stroke();

    // Approach dots (near bottom)
    const dotsY = H * 0.82;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    const centerX = W / 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(centerX + i * (laneWidth / 6), dotsY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Second row of dots
    const dotsY2 = H * 0.78;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX + i * (laneWidth / 8), dotsY2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Guide arrows (lane arrows pointing upward)
    const arrowY = H * 0.5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let i = -2; i <= 2; i++) {
      const ax = centerX + i * (laneWidth / 6);
      drawArrow(ax, arrowY, i === 0 ? 14 : 10);
    }

    // Pin deck area (darker area behind pins)
    const deckGrad = ctx.createLinearGradient(0, 0, 0, H * 0.12);
    deckGrad.addColorStop(0, 'rgba(20, 15, 30, 0.8)');
    deckGrad.addColorStop(1, 'rgba(20, 15, 30, 0)');
    ctx.fillStyle = deckGrad;
    ctx.fillRect(laneLeft, 0, laneWidth, H * 0.12);

    // Gutter groove lines
    ctx.strokeStyle = 'rgba(100, 80, 150, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(laneLeft + 3, 0);
    ctx.lineTo(laneLeft + 3, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(laneRight - 3, 0);
    ctx.lineTo(laneRight - 3, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawArrow(x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size * 0.6, y + size * 0.5);
    ctx.lineTo(x - size * 0.15, y + size * 0.2);
    ctx.lineTo(x - size * 0.15, y + size);
    ctx.lineTo(x + size * 0.15, y + size);
    ctx.lineTo(x + size * 0.15, y + size * 0.2);
    ctx.lineTo(x + size * 0.6, y + size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPins() {
    pins.forEach(pin => {
      if (pin.opacity <= 0) return;

      ctx.save();
      ctx.globalAlpha = pin.opacity;
      ctx.translate(pin.x, pin.y);
      ctx.rotate(pin.rotation);

      // Pin shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(3, 3, pin.radius, pin.radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pin body (white circle with gradient)
      const pinGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, pin.radius);
      pinGrad.addColorStop(0, '#ffffff');
      pinGrad.addColorStop(0.6, '#f0f0f0');
      pinGrad.addColorStop(1, '#d0d0d0');
      ctx.fillStyle = pinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, pin.radius, 0, Math.PI * 2);
      ctx.fill();

      // Pin red stripe
      ctx.strokeStyle = '#ff3d3d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, pin.radius * 0.6, -0.8, 0.8);
      ctx.stroke();

      // Pin outline (subtle)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, pin.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Knocked indicator (X mark)
      if (pin.knocked) {
        ctx.strokeStyle = `rgba(255, 80, 80, ${pin.opacity})`;
        ctx.lineWidth = 2;
        const s = pin.radius * 0.5;
        ctx.beginPath();
        ctx.moveTo(-s, -s);
        ctx.lineTo(s, s);
        ctx.moveTo(s, -s);
        ctx.lineTo(-s, s);
        ctx.stroke();
      }

      ctx.restore();
    });

    // Draw pin position markers (original positions) for standing pins
    if (gameState === 'waiting' || gameState === 'aiming') {
      pins.forEach(pin => {
        if (pin.knocked) return;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        ctx.arc(pin.originX, pin.originY, pin.radius + 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function drawBall() {
    if (!ball) return;

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(4, 4, ball.radius, ball.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball body
    const ballGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, ball.radius);
    ballGrad.addColorStop(0, '#9b7bff');
    ballGrad.addColorStop(0.4, '#7b68ee');
    ballGrad.addColorStop(1, '#4a38b0');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-ball.radius * 0.3, -ball.radius * 0.3, ball.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Ball finger holes
    ctx.fillStyle = 'rgba(30, 20, 60, 0.5)';
    ctx.beginPath();
    ctx.arc(-3, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Neon glow when rolling
    if (ball.rolling) {
      ctx.shadowColor = '#7b68ee';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = 'rgba(123, 104, 238, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function drawBallTrail() {
    ballTrail.forEach((t, i) => {
      ctx.fillStyle = `rgba(123, 104, 238, ${t.opacity * 0.3})`;
      ctx.beginPath();
      const r = BALL_RADIUS * t.opacity * 0.6;
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawSwipeGuide() {
    if (gameState !== 'waiting') return;
    if (!ball) return;

    // Animated arrow above the ball
    const bobY = Math.sin(guideArrowAnim) * 6;
    const baseY = ball.y - BALL_RADIUS - 35 + bobY;
    const alpha = 0.3 + Math.sin(guideArrowAnim * 1.5) * 0.15;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00d4ff';

    // Up arrow
    const ax = ball.x;
    const ay = baseY;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 12);
    ctx.lineTo(ax - 10, ay + 2);
    ctx.lineTo(ax - 3, ay);
    ctx.lineTo(ax - 3, ay + 14);
    ctx.lineTo(ax + 3, ay + 14);
    ctx.lineTo(ax + 3, ay);
    ctx.lineTo(ax + 10, ay + 2);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 11px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↑ スワイプして投球', ax, ay + 32);

    ctx.restore();

    // Show aim line while swiping
    if (gameState === 'aiming' && swipeStart && swipeEnd) {
      const dx = swipeEnd.x - swipeStart.x;
      const dy = swipeEnd.y - swipeStart.y;
      if (dy < -10) {
        const angle = Math.atan2(dy, dx);
        const len = Math.min(Math.sqrt(dx * dx + dy * dy), 150);

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(
          ball.x + Math.cos(angle) * len * 1.5,
          ball.y + Math.sin(angle) * len * 1.5
        );
        ctx.stroke();
        ctx.setLineDash([]);

        // Aim dot
        ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(
          ball.x + Math.cos(angle) * len * 1.5,
          ball.y + Math.sin(angle) * len * 1.5,
          5, 0, Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
      }
    }
  }

  // ==========================================
  // Start
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

})();
