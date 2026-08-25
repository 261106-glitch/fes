/* ============================================
   👤 User Manager - ユーザーデータ管理
   ============================================ */

const UserManager = (function () {
  'use strict';

  const STORAGE_KEY = 'fes_user_data';

  function _default() {
    return {
      nickname: null,
      scores: {
        bowling: null, // { value: number, rank: string, savedAt: string }
        crane: null    // { value: number, rank: string, savedAt: string }
      },
      riddleDone: {
        bowling: false,
        crane: false
      }
    };
  }

  function getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return _default();
      const p = JSON.parse(raw);
      const d = _default();
      return {
        nickname: (p.nickname !== undefined && p.nickname !== null) ? p.nickname : d.nickname,
        scores: {
          bowling: (p.scores && p.scores.bowling !== undefined) ? p.scores.bowling : d.scores.bowling,
          crane: (p.scores && p.scores.crane !== undefined) ? p.scores.crane : d.scores.crane
        },
        riddleDone: {
          bowling: (p.riddleDone && p.riddleDone.bowling !== undefined) ? p.riddleDone.bowling : d.riddleDone.bowling,
          crane: (p.riddleDone && p.riddleDone.crane !== undefined) ? p.riddleDone.crane : d.riddleDone.crane
        }
      };
    } catch (e) {
      console.error('UserManager read error:', e);
      return _default();
    }
  }

  function _save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('UserManager save error:', e);
      return false;
    }
  }

  // 評価ロジック
  // ボーリング: 6本以下 C, 7~9本 B, 10本以上 A
  function calcBowlingRank(score) {
    if (score <= 6) return 'C';
    if (score <= 9) return 'B';
    return 'A';
  }

  // クレーン: 0個 C, 1個 B, 2個以上 A
  function calcCraneRank(score) {
    if (score <= 0) return 'C';
    if (score === 1) return 'B';
    return 'A';
  }

  return {
    // ── ニックネーム ──────────────────────────────
    hasNickname() {
      return !!getData().nickname;
    },
    getNickname() {
      return getData().nickname || '';
    },
    /** 一度設定したら変更不可 */
    setNickname(name) {
      const data = getData();
      if (data.nickname) {
        return false; // 既に設定済みなら変更不可
      }
      const trimmed = (name || '').trim();
      if (!trimmed) return false;
      data.nickname = trimmed;
      return _save(data);
    },

    // ── スコア ────────────────────────────────────
    hasScore(gameId) {
      return getData().scores[gameId] !== null;
    },
    getScore(gameId) {
      return getData().scores[gameId];
    },
    /** 初回のみ保存（既にスコアがあれば何もしない） */
    saveScore(gameId, value) {
      const data = getData();
      if (data.scores[gameId] !== null) {
        return false; // 最初の1回分だけ保存
      }
      let rank = 'C';
      if (gameId === 'bowling') {
        rank = calcBowlingRank(value);
      } else if (gameId === 'crane') {
        rank = calcCraneRank(value);
      }

      data.scores[gameId] = {
        value: Number(value),
        rank: rank,
        savedAt: new Date().toISOString()
      };
      return _save(data);
    },
    hasAllScores() {
      const d = getData();
      return d.scores.bowling !== null && d.scores.crane !== null;
    },

    // ── 評価計算関数 ──────────────────────────────
    calcBowlingRank,
    calcCraneRank,

    // ── なぞなぞ ──────────────────────────────────
    isRiddleDone(gameId) {
      return !!getData().riddleDone[gameId];
    },
    setRiddleDone(gameId) {
      const data = getData();
      data.riddleDone[gameId] = true;
      return _save(data);
    },

    // ── リセット ──────────────────────────────────
    reset() {
      localStorage.removeItem(STORAGE_KEY);
    }
  };
})();
