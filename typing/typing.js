/* ============================================
   ⌨️ Typing Evaluation - Game Logic
   ============================================ */

(function () {
  'use strict';

  // --- DOM References ---
  const els = {};
  let selectedRank = null;

  function init() {
    cacheDom();
    setupEventListeners();
    updateBackBtnState();
    initRiddle();
    checkAlreadyRecorded();
  }

  function cacheDom() {
    els.backBtn = document.getElementById('backBtn');
    els.evalButtons = document.querySelectorAll('.eval-btn');
    
    // Confirm Modal
    els.confirmModal = document.getElementById('confirmModal');
    els.confirmRankDisplay = document.getElementById('confirmRankDisplay');
    els.confirmRankText = document.getElementById('confirmRankText');
    els.confirmOkBtn = document.getElementById('confirmOkBtn');
    els.confirmCancelBtn = document.getElementById('confirmCancelBtn');

    // Result Modal
    els.resultModal = document.getElementById('resultModal');
    els.resultIcon = document.getElementById('resultIcon');
    els.resultTitle = document.getElementById('resultTitle');
    els.resultRank = document.getElementById('resultRank');
    els.resultRallyBtn = document.getElementById('resultRallyBtn');

    // Riddle Elements
    els.riddleOverlay = document.getElementById('riddleOverlay');
    els.riddleFeedback = document.getElementById('riddleFeedback');
    els.riddleProceedBtn = document.getElementById('riddleProceedBtn');
    els.riddleOptions = document.querySelectorAll('.riddle-option-btn');
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

    // 評価ボタンのタップ
    els.evalButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const rank = this.getAttribute('data-rank');
        openConfirmModal(rank);
      });
    });

    // 確認モーダルのボタン
    els.confirmCancelBtn.addEventListener('click', closeConfirmModal);
    els.confirmOkBtn.addEventListener('click', confirmAndSaveRank);

    // 結果モーダルの「スタンプラリーに戻る」
    els.resultRallyBtn.addEventListener('click', function () {
      navigateTo('../index.html');
    });
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

  // --- Riddle Handling ---
  function initRiddle() {
    if (UserManager.isRiddleDone('typing')) {
      return; // 既にクリア済みなら表示しない
    }

    els.riddleOverlay.classList.remove('hidden');

    const correctAnswerIndex = 1; // 2. キーボード

    els.riddleOptions.forEach((btn) => {
      btn.addEventListener('click', () => {
        const selected = parseInt(btn.getAttribute('data-index'), 10);
        if (selected === correctAnswerIndex) {
          // 正解
          vibrate([50, 50, 100]);
          els.riddleFeedback.className = 'riddle-feedback riddle-feedback--success';
          els.riddleFeedback.innerHTML = '🎉 <strong>正解！</strong><br>キーボードには文字入力用のキーがたくさんありますが、鍵穴はありません！';
          els.riddleFeedback.classList.remove('hidden');

          // 選択肢無効化
          els.riddleOptions.forEach(b => b.disabled = true);

          // 「評価へ進む」ボタン
          els.riddleProceedBtn.classList.remove('hidden');
          els.riddleProceedBtn.onclick = () => {
            UserManager.setRiddleDone('typing');
            els.riddleOverlay.classList.add('hidden');
          };
        } else {
          // 不正解
          vibrate(100);
          els.riddleFeedback.className = 'riddle-feedback riddle-feedback--error';
          els.riddleFeedback.innerHTML = '❌ <strong>ざんねん！不正解…</strong><br>もう一度考えて選んでね！';
          els.riddleFeedback.classList.remove('hidden');
        }
      });
    });
  }

  // --- Confirm Modal ---
  function openConfirmModal(rank) {
    selectedRank = rank;
    vibrate(30);

    els.confirmRankDisplay.textContent = rank;
    els.confirmRankDisplay.className = confirm-rank-display confirm-rank-display--;
    els.confirmRankText.textContent = 評価【  】;

    els.confirmModal.classList.remove('hidden');
  }

  function closeConfirmModal() {
    selectedRank = null;
    els.confirmModal.classList.add('hidden');
  }

  // --- Confirm & Save ---
  function confirmAndSaveRank() {
    if (!selectedRank) return;

    const rank = selectedRank;
    closeConfirmModal();

    // 初回スコア保存
    UserManager.saveScore('typing', rank);
    
    // スタンプ付与
    StampManager.addStamp('typing');

    // 戻るボタンの制限解除
    updateBackBtnState();

    // 結果モーダル表示
    showResultModal(rank);
  }

  function showResultModal(rank) {
    // 演出
    showConfetti(4000, 80);
    if (rank === 'S' || rank === 'A') {
      vibrate([100, 50, 100, 50, 200]);
    } else {
      vibrate([100, 100]);
    }

    els.resultRank.textContent = rank;
    els.resultRank.className = ank-badge rank-badge--;
    els.resultRank.style.fontSize = '1.3rem';
    els.resultRank.style.padding = '4px 16px';

    if (rank === 'S') {
      els.resultIcon.textContent = '👑';
      els.resultTitle.textContent = '最高ランク 達成！';
    } else if (rank === 'A') {
      els.resultIcon.textContent = '🌟';
      els.resultTitle.textContent = '素晴らしい！';
    } else if (rank === 'B') {
      els.resultIcon.textContent = '✨';
      els.resultTitle.textContent = 'ナイスファイト！';
    } else {
      els.resultIcon.textContent = '🎉';
      els.resultTitle.textContent = '評価完了！';
    }

    els.resultModal.classList.remove('hidden');
  }

  // 既に記録済みの場合は表示を調整（再訪問時）
  function checkAlreadyRecorded() {
    if (UserManager.hasScore('typing')) {
      const saved = UserManager.getScore('typing');
      // 画面上部に記録済みバッジを表示する等のガイド
      const guideDesc = document.querySelector('.typing-guide-desc');
      if (guideDesc && saved) {
        guideDesc.innerHTML = <span style="color: var(--neon-green); font-weight: 700;">✅ 記録済み（評価: ）</span> - スタンプ獲得済みです！;
      }
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
