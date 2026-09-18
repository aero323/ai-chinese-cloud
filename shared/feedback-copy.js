(function (global) {
  "use strict";

  const pools = {
    correct: [
      { zh: "太棒了！", id: "Hebat!", emoji: "🤩" },
      { zh: "厉害！", id: "Keren!", emoji: "😎" },
      { zh: "干得漂亮！", id: "Kerja bagus!", emoji: "👏" },
      { zh: "就是这样！", id: "Itu dia!", emoji: "🔥" },
      { zh: "真不错！", id: "Bagus!", emoji: "🥳" }
    ],
    correctFirstTry: [
      { zh: "完美！", id: "Sempurna!", emoji: "🏆" },
      { zh: "一处都没错！", id: "Tidak ada yang salah!", emoji: "🏆" },
      { zh: "一次就全对！", id: "Sekali coba, benar semua!", emoji: "🏆" }
    ],
    wrong: [
      { zh: "再来一遍？", id: "Mau coba lagi?", emoji: "💪" },
      { zh: "差一点点，再来！", id: "Hampir benar, ayo coba lagi!", emoji: "💪" }
    ]
  };

  const fixed = {
    pair: {
      match: { zh: "4 组全部连对！", id: "Semua pasangan benar!" },
      memory: { zh: "四组问候全部配对成功！", id: "Semua pasangan berhasil ditemukan!" }
    },
    record: { zh: "收到啦！", id: "Sudah diterima!" },
    submitted: { zh: "已提交！", id: "Sudah dikirim!" }
  };

  let lastZh = "";

  function draw(key) {
    const pool = pools[key];
    if (!Array.isArray(pool) || pool.length === 0) return null;
    let candidates = pool.length > 1
      ? pool.filter(function (entry) { return entry.zh !== lastZh; })
      : pool.slice();
    if (candidates.length === 0) candidates = pool.slice();
    const entry = candidates[Math.floor(Math.random() * candidates.length)];
    lastZh = entry.zh;
    return { zh: entry.zh, id: entry.id, emoji: entry.emoji };
  }

  global.AICloudFeedbackCopy = {
    correct: pools.correct,
    correctFirstTry: pools.correctFirstTry,
    wrong: pools.wrong,
    pair: fixed.pair,
    record: fixed.record,
    submitted: fixed.submitted,
    draw: draw
  };
})(typeof window !== "undefined" ? window : globalThis);
