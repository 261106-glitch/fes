/* ============================================
   ⌨️ Typing Evaluation - Game Logic
   ============================================ */

(function () {
  'use strict';

  // --- DOM References ---
  const els = {};

  function init() {
    cacheDom();
    setupEventListeners();
    updateBackBtnState();
    checkAlreadyRecorded();
  }

  function cacheDom() {
    els.backBtn = document.getElementById('backBtn');
    els.evalButtons = document.querySelectorAll('.eval-btn');

    // Result Modal
    els.resultModal = document.getElementById('resultModal');
    els.resultIcon = document.getElementById('resultIcon');
    els.resultTitle = document.getElementById('resultTitle');
    els.resultRank = document.getElementById('resultRank');
    els.resultRallyBtn = document.getElementById('resultRallyBtn');
  }

  function setupEventListeners() {
    // 戻るボタンの制御
    if (els.backBtn) {
      els.backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!UserManager.hasScore('typing')) {
          alert('スコアが保存されるまでホームには戻れません！⌨️');
          return;
        }
        navigateTo('../index.html');
      });
    }

    // 評価ボタンのタップ（タップしたら記録してホームに戻す）
    els.evalButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const rank = this.getAttribute('data-rank');
        handleRankSelection(rank);
      });
    });

    // 結果モーダルの「スタンプラリーに戻る」
    if (els.resultRallyBtn) {
      els.resultRallyBtn.addEventListener('click', function () {
        navigateTo('../index.html');
      });
    }
  }

  function updateBackBtnState() {
    if (!els.backBtn) return;
    if (UserManager.hasScore('typing')) {
      els.backBtn.classList.remove('disabled-link');
      els.backBtn.removeAttribute('style');
    } else {
      els.backBtn.classList.add('disabled-link');
      els.backBtn.style.opacity = '0.3';
      els.backBtn.style.pointerEvents = 'none';
    }
  }

  // --- 評価ボタンタップ時の処理（記録してホームに戻す） ---
  function handleRankSelection(rank) {
    if (!rank) return;

    // 初回スコア保存
    UserManager.saveScore('typing', rank);

    // スタンプ付与
    StampManager.addStamp('typing');

    // 戻るボタンの制限解除
    updateBackBtnState();

    // 演出
    showConfetti(3000, 80);
    if (rank === 'S' || rank === 'A') {
      vibrate([100, 50, 100, 50, 200]);
    } else {
      vibrate([100, 100]);
    }

    // 結果モーダルを表示して「スタンプラリーに戻る」を促す、または1.5秒後に自動でホームに戻す
    showResultAndReturn(rank);
  }

  function showResultAndReturn(rank) {
    if (els.resultRank) {
      els.resultRank.textContent = rank;
      els.resultRank.className = 'rank-badge rank-badge--' + rank;
      els.resultRank.style.fontSize = '1.3rem';
      els.resultRank.style.padding = '4px 16px';
    }

    if (els.resultIcon && els.resultTitle) {
      if (rank === 'S') {
        els.resultIcon.textContent = '👑';
        els.resultTitle.textContent = '最高ランク S 達成！';
      } else if (rank === 'A') {
        els.resultIcon.textContent = '🌟';
        els.resultTitle.textContent = '評価 A 達成！';
      } else if (rank === 'B') {
        els.resultIcon.textContent = '✨';
        els.resultTitle.textContent = '評価 B 達成！';
      } else {
        els.resultIcon.textContent = '👍';
        els.resultTitle.textContent = '評価 C 達成！';
      }
    }

    if (els.resultModal) {
      els.resultModal.classList.remove('hidden');
    }

    // 2秒後に自動でホームに戻る（ボタンを押しても即戻れる）
    setTimeout(() => {
      navigateTo('../index.html');
    }, 2000);
  }

  // 既に記録済みの場合は表示を調整（再訪問時）
  function checkAlreadyRecorded() {
    if (UserManager.hasScore('typing')) {
      const saved = UserManager.getScore('typing');
      const guideDesc = document.querySelector('.typing-guide-desc');
      if (guideDesc && saved) {
        guideDesc.innerHTML = '<span style="color: var(--neon-green); font-weight: 700;">✅ 記録済み（評価: ' + saved.rank + '）</span><br>もう一度ボタンを押すとホームに戻ります。';
      }
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
