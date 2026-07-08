/* ============================================
   📦 Stamp Manager - localStorage管理
   ============================================ */

const StampManager = {
  STORAGE_KEY: 'schoolEventStampRally',

  /** デフォルトのスタンプ状態 */
  _defaultStamps() {
    return {
      bowling: { completed: false, timestamp: null },
      crane: { completed: false, timestamp: null },
      mystery: { completed: false, timestamp: null }
    };
  },

  /** 全スタンプの状態を取得 */
  getStamps() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return this._defaultStamps();
      const parsed = JSON.parse(data);
      // 既存データに不足があればデフォルトで補完
      const defaults = this._defaultStamps();
      return {
        bowling: parsed.bowling || defaults.bowling,
        crane: parsed.crane || defaults.crane,
        mystery: parsed.mystery || defaults.mystery
      };
    } catch (e) {
      console.error('StampManager: Failed to read stamps', e);
      return this._defaultStamps();
    }
  },

  /** スタンプを付与 */
  addStamp(gameId) {
    if (!['bowling', 'crane', 'mystery'].includes(gameId)) {
      console.error('StampManager: Invalid gameId:', gameId);
      return false;
    }
    const stamps = this.getStamps();
    if (stamps[gameId].completed) {
      return false; // 既にクリア済み
    }
    stamps[gameId] = {
      completed: true,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stamps));
      return true;
    } catch (e) {
      console.error('StampManager: Failed to save stamp', e);
      return false;
    }
  },

  /** 特定ゲームのクリア状態を確認 */
  isCompleted(gameId) {
    return this.getStamps()[gameId]?.completed || false;
  },

  /** 全クリア確認 */
  isAllCompleted() {
    const stamps = this.getStamps();
    return stamps.bowling.completed && stamps.crane.completed && stamps.mystery.completed;
  },

  /** クリア済みスタンプ数 */
  getCompletedCount() {
    const stamps = this.getStamps();
    let count = 0;
    if (stamps.bowling.completed) count++;
    if (stamps.crane.completed) count++;
    if (stamps.mystery.completed) count++;
    return count;
  },

  /** リセット（デバッグ用） */
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};
