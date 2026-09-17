(function (global) {
  "use strict";

  const ACTIVITIES = [
    {
      type: "choice",
      page: "interaction-choice.html",
      icon: "🅰️",
      title: "快速选择",
      titleId: "Pilihan cepat",
      cardTitle: "快速选择",
      cardDescription: "读题，点选正确答案，提交后立即看到对错。",
      tags: ["一分钟", "自动判分"],
      ready: true,
      legacy: false
    },
    {
      type: "order",
      page: "interaction-order.html",
      icon: "🔢",
      title: "句子排序",
      titleId: "Urutkan kalimat",
      cardTitle: "句子排序",
      cardDescription: "点选词块，把它们排成通顺的一句话，提交后看到正确答案。",
      tags: ["一分钟", "自动判分"],
      ready: true,
      legacy: false
    },
    {
      type: "fill",
      page: "interaction-fill.html",
      icon: "✏️",
      title: "补全句子",
      titleId: "Lengkapi kalimat",
      cardTitle: "补全句子",
      cardDescription: "在句子的空格里输入词语，答案支持多种写法。",
      tags: ["一分钟", "自动判分"],
      ready: true,
      legacy: false
    },
    {
      type: "poll",
      page: "interaction-poll.html",
      icon: "📊",
      title: "课堂投票",
      titleId: "Polling kelas",
      cardTitle: "课堂投票",
      cardDescription: "点选你的想法并提交，不计分，老师查看统计。",
      tags: ["不计分"],
      ready: true,
      legacy: false
    },
    {
      type: "match",
      page: "match.html",
      icon: "🔗",
      title: "连线配对",
      titleId: "Hubungkan",
      cardTitle: "问候时间连线",
      cardDescription: "把中文时间和正确的印尼语意思连起来。",
      tags: ["左右配对", "自动判分"],
      ready: true,
      legacy: true
    },
    {
      type: "memory",
      page: "memory.html",
      icon: "🧠",
      title: "记忆翻牌",
      titleId: "Kartu memori",
      cardTitle: "问候翻翻乐",
      cardDescription: "翻开卡片，找到中文和印尼语配对。",
      tags: ["卡片配对", "自动判分"],
      ready: true,
      legacy: true
    },
    {
      type: "picture",
      page: "interaction-picture.html",
      icon: "🖼️",
      title: "看图单选",
      titleId: "Pilih gambar",
      cardTitle: "看图单选",
      cardDescription: "看一张图，从选项里选出正确的词。",
      tags: ["一分钟", "自动判分"],
      ready: true,
      legacy: false
    },
    {
      type: "picture-match",
      page: "interaction-picture-match.html",
      icon: "🧩",
      title: "图片—词语连线",
      titleId: "Gambar dan kata",
      cardTitle: "图片—词语连线",
      cardDescription: "点左边的图，再点右边的词，配对成功就锁定。",
      tags: ["点选配对", "自动判分"],
      ready: true,
      legacy: false
    },
    {
      type: "situation",
      page: "interaction-situation.html",
      icon: "🙋",
      title: "情景选择",
      titleId: "Situasi dan ucapan",
      cardTitle: "情景选择",
      cardDescription: "看场景，选出这个场合里最得体的说法。",
      tags: ["一分钟", "自动判分"],
      ready: true,
      legacy: false
    },
    {
      type: "dialogue",
      page: "interaction-dialogue.html",
      icon: "💬",
      title: "对话补全",
      titleId: "Lengkapi dialog",
      cardTitle: "对话补全",
      cardDescription: "看上一句，选出合适的下一句，填进对话气泡。",
      tags: ["一分钟", "自动判分"],
      ready: true,
      legacy: false
    }
  ];

  function all() {
    return ACTIVITIES.slice();
  }

  function ready() {
    return ACTIVITIES.filter(function (item) {
      return item.ready === true;
    });
  }

  function get(type) {
    return ACTIVITIES.filter(function (item) {
      return item.type === type;
    })[0] || null;
  }

  function label(type) {
    const meta = get(type);
    return meta ? meta.title : type;
  }

  function linkFor(type, options) {
    const meta = get(type);
    if (!meta || !meta.page) return "";
    const settings = options || {};
    const parts = ["type=" + encodeURIComponent(type)];
    const slot = Number(settings.slot) || 0;
    if (settings.mode === "class" && slot > 0) {
      parts.push("mode=class");
      parts.push("slot=" + slot);
    }
    return meta.page + "?" + parts.join("&");
  }

  const api = {
    all: all,
    ready: ready,
    get: get,
    label: label,
    linkFor: linkFor
  };

  global.AICloudActivityTypes = api;
})(typeof window !== "undefined" ? window : globalThis);
