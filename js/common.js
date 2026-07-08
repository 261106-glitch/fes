/* ============================================
   🔧 Common Utilities
   ============================================ */

/**
 * 紙吹雪エフェクトを表示
 * @param {number} duration - 紙吹雪の持続時間（ms）
 * @param {number} count - 紙吹雪の数
 */
function showConfetti(duration = 3000, count = 60) {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#ff6b9d', '#7b68ee', '#00f5a0', '#ffd700', '#ff8c42', '#00d4ff'];
  const shapes = ['square', 'circle'];

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.random() * 8 + 6;
    const left = Math.random() * 100;
    const animDuration = Math.random() * 2 + 1.5;
    const delay = Math.random() * 0.8;

    piece.style.cssText = `
      left: ${left}%;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${shape === 'circle' ? '50%' : '2px'};
      animation-duration: ${animDuration}s;
      animation-delay: ${delay}s;
    `;

    container.appendChild(piece);
  }

  setTimeout(() => {
    container.remove();
  }, duration + 2000);
}

/**
 * バイブレーション（対応デバイスのみ）
 * @param {number|number[]} pattern - バイブレーションパターン
 */
function vibrate(pattern = 50) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/**
 * ページ遷移（フェードアウト付き）
 * @param {string} url - 遷移先URL
 */
function navigateTo(url) {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.3s ease';
  setTimeout(() => {
    window.location.href = url;
  }, 300);
}

/**
 * ページ読み込み時にフェードイン
 */
function initPageTransition() {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });
}

// ページロード時に自動でフェードイン
document.addEventListener('DOMContentLoaded', initPageTransition);
