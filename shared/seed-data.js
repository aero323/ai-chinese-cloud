(function attachSeedData(global) {
  "use strict";

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function atTime(date, hour, minute) {
    const next = new Date(date);
    next.setHours(hour, minute, 0, 0);
    return next;
  }

  function iso(date) {
    return date.toISOString();
  }

  function createSeedData() {
    const now = new Date();
    const todayAt = atTime(now, now.getHours(), Math.max(0, now.getMinutes() - 10));
    const liveStart = new Date(todayAt);
    const liveEnd = new Date(liveStart.getTime() + 40 * 60 * 1000);
    const previewStart = atTime(addDays(now, 1), 20, 0);
    const waitlistStart = atTime(addDays(now, 2), 19, 30);
    const pastStart = atTime(addDays(now, -1), 20, 0);
    const pastEnd = new Date(pastStart.getTime() + 40 * 60 * 1000);
    const seriesStarts = [3, 10, 17, 24].map((day) => atTime(addDays(now, day), 18, 30));
    const seriesIds = ["series-session-1", "series-session-2", "series-session-3", "series-session-4"];

    const users = [
      {
        id: "student-anisa",
        role: "student",
        name: "Anisa",
        nameZh: "安",
        phone: "+62 812 0000 1821",
        avatar: "安",
        timeZone: "Asia/Jakarta",
        locale: "id-ID",
        status: "active"
      },
      {
        id: "student-raymond",
        role: "student",
        name: "Raymond",
        nameZh: "雷",
        phone: "+86 139 0000 2333",
        avatar: "雷",
        timeZone: "Asia/Shanghai",
        locale: "zh-CN",
        status: "active"
      },
      {
        id: "student-maya",
        role: "student",
        name: "Maya Putri",
        nameZh: "玛雅",
        phone: "+62 813 8000 2121",
        avatar: "玛",
        timeZone: "Asia/Jakarta",
        locale: "id-ID",
        status: "active"
      },
      {
        id: "student-kevin",
        role: "student",
        name: "Kevin Tan",
        nameZh: "凯文",
        phone: "+65 9000 8801",
        avatar: "凯",
        timeZone: "Asia/Singapore",
        locale: "en-SG",
        status: "active"
      },
      {
        id: "teacher-lina",
        role: "teacher",
        name: "Lina 老师",
        avatar: "Li",
        timeZone: "Asia/Shanghai",
        locale: "zh-CN",
        status: "active",
        specialties: ["口语", "大班互动", "入门"],
        experienceYears: 8,
        bio: "擅长用游戏和情境对话，让零基础学习者在轻松氛围中开口说中文。"
      },
      {
        id: "teacher-berenice",
        role: "teacher",
        name: "Berenice 老师",
        avatar: "Be",
        timeZone: "Asia/Jakarta",
        locale: "zh-CN",
        status: "active",
        specialties: ["发音", "阅读", "儿童"],
        experienceYears: 6,
        bio: "关注每个学生的表达节奏，擅长把复习内容设计成可重复练习的小游戏。"
      },
      {
        id: "operator-ray",
        role: "operator",
        name: "Ray 运营",
        avatar: "Ra",
        timeZone: "Asia/Shanghai",
        locale: "zh-CN",
        status: "active",
        title: "课程运营负责人"
      }
    ];

    const students = [
      {
        userId: "student-anisa",
        program: "Mandarin Explorer",
        level: "初级 2",
        learningGoal: "日常问候与旅行表达",
        preferredTeacherId: "teacher-lina",
        preferredTimeZone: "Asia/Jakarta",
        joinedAt: iso(addDays(now, -42)),
        tags: ["印尼", "移动端高频", "口语优先"],
        notes: "喜欢游戏化练习，预习完成率较高。"
      },
      {
        userId: "student-raymond",
        program: "Mandarin Explorer",
        level: "初级 1",
        learningGoal: "HSK 1 基础",
        preferredTeacherId: "teacher-berenice",
        preferredTimeZone: "Asia/Shanghai",
        joinedAt: iso(addDays(now, -16)),
        tags: ["上海", "晚间课", "需要复习提醒"],
        notes: "工作日晚上可上课。"
      },
      {
        userId: "student-maya",
        program: "Mandarin Junior",
        level: "启蒙 3",
        learningGoal: "学校场景与拼音",
        preferredTeacherId: "teacher-lina",
        preferredTimeZone: "Asia/Jakarta",
        joinedAt: iso(addDays(now, -80)),
        tags: ["少儿", "家长关注预习", "发音"],
        notes: "喜欢音频材料。"
      },
      {
        userId: "student-kevin",
        program: "Mandarin Explorer",
        level: "初级 3",
        learningGoal: "商务旅行中文",
        preferredTeacherId: "teacher-berenice",
        preferredTimeZone: "Asia/Singapore",
        joinedAt: iso(addDays(now, -110)),
        tags: ["新加坡", "商务", "进度快"],
        notes: "可接受临时候补通知。"
      }
    ];

    const folders = [
      { id: "folder-root", parentId: null, name: "中文课程库", order: 1, color: "#6552ff", description: "大班课课程内容与材料的总目录" },
      { id: "folder-greetings", parentId: "folder-root", name: "问候与时间", order: 1, color: "#f4a2c1", description: "问候、时间、日期和日常表达" },
      { id: "folder-campus", parentId: "folder-root", name: "校园与生活", order: 2, color: "#69d5c5", description: "校园、朋友、饮食和旅行场景" },
      { id: "folder-travel", parentId: "folder-root", name: "旅行中文", order: 3, color: "#ffad67", description: "机场、酒店与交通表达" }
    ];

    const lessons = [
      {
        id: "lesson-greetings",
        folderId: "folder-greetings",
        title: "嗨！你好！",
        subtitle: "Halo! Apa kabar?",
        description: "学习问候、自我介绍和一天中的不同时间。",
        durationMinutes: 40,
        tags: ["入门", "口语", "问候"],
        color: "#6552ff",
        coverEmoji: "👋",
        status: "published"
      },
      {
        id: "lesson-time",
        folderId: "folder-greetings",
        title: "现在几点？",
        subtitle: "Sekarang jam berapa?",
        description: "用中文询问和回答时间，并理解一天中的时段。",
        durationMinutes: 40,
        tags: ["时间", "听力", "大班课"],
        color: "#66b7f4",
        coverEmoji: "🕒",
        status: "published"
      },
      {
        id: "lesson-friends",
        folderId: "folder-campus",
        title: "认识新朋友",
        subtitle: "Berkenalan dengan teman baru",
        description: "练习姓名、国家和“很高兴认识你”。",
        durationMinutes: 40,
        tags: ["自我介绍", "对话", "初级"],
        color: "#69d5c5",
        coverEmoji: "🧑‍🤝‍🧑",
        status: "published"
      },
      {
        id: "lesson-food",
        folderId: "folder-campus",
        title: "我想吃面条",
        subtitle: "Saya ingin makan mie",
        description: "在餐厅点餐，表达喜欢和不喜欢的食物。",
        durationMinutes: 40,
        tags: ["饮食", "情境对话", "词汇"],
        color: "#ffad67",
        coverEmoji: "🍜",
        status: "published"
      }
    ];

    const sessions = [
      {
        id: "session-live",
        lessonId: "lesson-greetings",
        seriesId: null,
        teacherId: "teacher-lina",
        title: "周五晚 · 问候口语大班课",
        startAt: iso(liveStart),
        endAt: iso(liveEnd),
        capacity: 30,
        status: "published",
        bookingCloseAt: iso(new Date(liveStart.getTime() + 10 * 60 * 1000)),
        cancelCloseAt: iso(new Date(liveStart.getTime() - 2 * 60 * 60 * 1000)),
        language: "zh-id",
        roomLabel: "大班教室 A",
        source: "single"
      },
      {
        id: "session-preview",
        lessonId: "lesson-friends",
        seriesId: null,
        teacherId: "teacher-berenice",
        title: "认识新朋友 · 周末体验课",
        startAt: iso(previewStart),
        endAt: iso(new Date(previewStart.getTime() + 40 * 60 * 1000)),
        capacity: 30,
        status: "published",
        bookingCloseAt: iso(new Date(previewStart.getTime() - 30 * 60 * 1000)),
        cancelCloseAt: iso(new Date(previewStart.getTime() - 2 * 60 * 60 * 1000)),
        language: "zh-id",
        roomLabel: "大班教室 B",
        source: "single"
      },
      {
        id: "session-waitlist-full",
        lessonId: "lesson-time",
        seriesId: null,
        teacherId: "teacher-lina",
        title: "时间表达 · 满员演练课",
        startAt: iso(waitlistStart),
        endAt: iso(new Date(waitlistStart.getTime() + 40 * 60 * 1000)),
        capacity: 2,
        status: "published",
        bookingCloseAt: iso(new Date(waitlistStart.getTime() - 30 * 60 * 1000)),
        cancelCloseAt: iso(new Date(waitlistStart.getTime() - 2 * 60 * 60 * 1000)),
        language: "zh-id",
        roomLabel: "大班教室 A",
        source: "single"
      },
      {
        id: "session-past",
        lessonId: "lesson-greetings",
        seriesId: null,
        teacherId: "teacher-lina",
        title: "问候复习 · 已结束",
        startAt: iso(pastStart),
        endAt: iso(pastEnd),
        capacity: 30,
        status: "published",
        bookingCloseAt: iso(new Date(pastStart.getTime() - 30 * 60 * 1000)),
        cancelCloseAt: iso(new Date(pastStart.getTime() - 2 * 60 * 60 * 1000)),
        language: "zh-id",
        roomLabel: "大班教室 A",
        source: "single"
      },
      ...seriesStarts.map((start, index) => ({
        id: seriesIds[index],
        lessonId: index < 2 ? "lesson-food" : "lesson-greetings",
        seriesId: "series-weekly-food",
        teacherId: "teacher-lina",
        title: `餐厅中文系列 · 第 ${index + 1} 课`,
        startAt: iso(start),
        endAt: iso(new Date(start.getTime() + 40 * 60 * 1000)),
        capacity: 24,
        status: "published",
        bookingCloseAt: iso(new Date(start.getTime() - 30 * 60 * 1000)),
        cancelCloseAt: iso(new Date(start.getTime() - 2 * 60 * 60 * 1000)),
        language: "zh-id",
        roomLabel: "系列教室 C",
        source: "series"
      }))
    ];

    const series = [
      {
        id: "series-weekly-food",
        lessonId: "lesson-food",
        title: "餐厅中文 · 四周系列大班课",
        description: "每周一次，从点餐、口味到结账，连续练习餐厅场景。",
        teacherId: "teacher-lina",
        capacity: 24,
        durationMinutes: 40,
        sessionIds: seriesIds,
        weekdays: [1, 3, 5, 0],
        status: "published",
        createdAt: iso(addDays(now, -5))
      }
    ];

    const bookings = [
      { id: "booking-live-anisa", sessionId: "session-live", studentId: "student-anisa", status: "booked", source: "student", createdAt: iso(addDays(now, -3)), enrollmentId: null },
      { id: "booking-live-maya", sessionId: "session-live", studentId: "student-maya", status: "booked", source: "student", createdAt: iso(addDays(now, -2)), enrollmentId: null },
      { id: "booking-live-raymond", sessionId: "session-live", studentId: "student-raymond", status: "booked", source: "operator", createdAt: iso(addDays(now, -2)), enrollmentId: null },
      { id: "booking-waitlist-raymond", sessionId: "session-waitlist-full", studentId: "student-raymond", status: "booked", source: "student", createdAt: iso(addDays(now, -1)), enrollmentId: null },
      { id: "booking-waitlist-maya", sessionId: "session-waitlist-full", studentId: "student-maya", status: "booked", source: "student", createdAt: iso(addDays(now, -1)), enrollmentId: null },
      { id: "booking-past-anisa", sessionId: "session-past", studentId: "student-anisa", status: "booked", source: "student", createdAt: iso(addDays(now, -8)), enrollmentId: null },
      { id: "booking-preview-kevin", sessionId: "session-preview", studentId: "student-kevin", status: "booked", source: "student", createdAt: iso(addDays(now, -1)), enrollmentId: null }
    ];

    const waitlist = [
      { id: "wait-session-waitlist-anisa", sessionId: "session-waitlist-full", sessionIds: [], studentId: "student-anisa", status: "waiting", createdAt: iso(addDays(now, -1)), seriesId: null }
    ];


    // ---- 预制互动模板库：主题 × 题型 × 难度 ----
    const templateTopics = [
      {
        id: "greeting",
        label: "问候与寒暄",
        emoji: "👋",
        words: [["你好", "nǐ hǎo", "Halo"], ["谢谢", "xièxie", "Terima kasih"], ["再见", "zàijiàn", "Sampai jumpa"], ["不客气", "bú kèqi", "Sama-sama"], ["早上好", "zǎoshang hǎo", "Selamat pagi"]],
        sentence: "你好，很高兴认识你",
        advanced: "今天早上我和新朋友打招呼",
        poll: "见面时你最常用哪种问候？",
        pollOptions: ["你好", "早上好", "挥挥手"]
      },
      {
        id: "name",
        label: "自我介绍",
        emoji: "🙋",
        words: [["我叫", "wǒ jiào", "Nama saya"], ["你呢", "nǐ ne", "Kamu?"], ["老师", "lǎoshī", "Guru"], ["同学", "tóngxué", "Teman sekelas"], ["很高兴", "hěn gāoxìng", "Senang"]],
        sentence: "我叫 Anisa，你呢",
        advanced: "我是印尼学生，我喜欢学中文",
        poll: "你学中文多久了？",
        pollOptions: ["不到一年", "一到三年", "三年以上"]
      },
      {
        id: "number",
        label: "数字与年龄",
        emoji: "🔢",
        words: [["一", "yī", "Satu"], ["二", "èr", "Dua"], ["三", "sān", "Tiga"], ["十", "shí", "Sepuluh"], ["百", "bǎi", "Seratus"]],
        sentence: "我今年二十岁",
        advanced: "我们班一共有三十五个学生",
        poll: "你今天几点开始上课？",
        pollOptions: ["七点", "八点", "九点"]
      },
      {
        id: "food",
        label: "食物与口味",
        emoji: "🍜",
        words: [["面条", "miàntiáo", "Mi"], ["米饭", "mǐfàn", "Nasi"], ["辣", "là", "Pedas"], ["好吃", "hǎochī", "Enak"], ["喝水", "hē shuǐ", "Minum air"]],
        sentence: "我想吃面条",
        advanced: "这家餐厅的牛肉面非常好吃",
        poll: "你最喜欢哪种中国菜？",
        pollOptions: ["面条", "米饭", "饺子"]
      },
      {
        id: "restaurant",
        label: "餐厅点餐",
        emoji: "🥟",
        words: [["点菜", "diǎn cài", "Pesan makanan"], ["菜单", "càidān", "Menu"], ["买单", "mǎidān", "Bayar"], ["服务员", "fúwùyuán", "Pelayan"], ["不要辣", "bú yào là", "Jangan pedas"]],
        sentence: "服务员，我想点菜",
        advanced: "请给我一份饺子，不要放辣",
        poll: "在餐厅你最先做什么？",
        pollOptions: ["看菜单", "叫服务员", "点饮料"]
      },
      {
        id: "time",
        label: "时间与日期",
        emoji: "🕒",
        words: [["现在", "xiànzài", "Sekarang"], ["早上", "zǎoshang", "Pagi"], ["下午", "xiàwǔ", "Siang"], ["晚上", "wǎnshang", "Malam"], ["上课", "shàngkè", "Mulai kelas"]],
        sentence: "我们下午三点上课",
        advanced: "明天晚上七点我们一起吃饭",
        poll: "你习惯什么时间学习？",
        pollOptions: ["早上", "下午", "晚上"]
      },
      {
        id: "weather",
        label: "天气与季节",
        emoji: "🌦️",
        words: [["天气", "tiānqì", "Cuaca"], ["下雨", "xià yǔ", "Hujan"], ["热", "rè", "Panas"], ["冷", "lěng", "Dingin"], ["带伞", "dài sǎn", "Bawa payung"]],
        sentence: "今天天气很好",
        advanced: "雅加达下午常常下雨，记得带伞",
        poll: "你喜欢什么天气？",
        pollOptions: ["晴天", "下雨", "阴天"]
      },
      {
        id: "shopping",
        label: "购物与价格",
        emoji: "🛍️",
        words: [["多少钱", "duōshao qián", "Berapa harganya"], ["便宜", "piányi", "Murah"], ["太贵", "tài guì", "Terlalu mahal"], ["买", "mǎi", "Beli"], ["打折", "dǎzhé", "Diskon"]],
        sentence: "这个多少钱",
        advanced: "这件衣服太贵了，可以便宜一点吗",
        poll: "买东西你最看重什么？",
        pollOptions: ["价格", "质量", "样式"]
      },
      {
        id: "direction",
        label: "方位与问路",
        emoji: "🧭",
        words: [["左边", "zuǒbian", "Sebelah kiri"], ["右边", "yòubian", "Sebelah kanan"], ["前面", "qiánmiàn", "Di depan"], ["地铁站", "dìtiě zhàn", "Stasiun MRT"], ["怎么走", "zěnme zǒu", "Bagaimana jalan"]],
        sentence: "请问地铁站怎么走",
        advanced: "一直往前走，然后在路口向右转",
        poll: "你出门最常用的交通方式？",
        pollOptions: ["走路", "地铁", "打车"]
      },
      {
        id: "family",
        label: "家庭与朋友",
        emoji: "👨‍👩‍👧",
        words: [["家人", "jiārén", "Keluarga"], ["爸爸", "bàba", "Ayah"], ["妈妈", "māma", "Ibu"], ["朋友", "péngyou", "Teman"], ["一起", "yìqǐ", "Bersama"]],
        sentence: "我家有四个人",
        advanced: "周末我和家人一起去公园",
        poll: "你家里有几个人？",
        pollOptions: ["三个人", "四个人", "五个人以上"]
      },
      {
        id: "hobby",
        label: "爱好与运动",
        emoji: "⚽",
        words: [["喜欢", "xǐhuan", "Suka"], ["唱歌", "chànggē", "Bernyanyi"], ["打球", "dǎ qiú", "Main bola"], ["看书", "kàn shū", "Baca buku"], ["旅行", "lǚxíng", "Bepergian"]],
        sentence: "我喜欢唱歌和看书",
        advanced: "我最喜欢的运动是周末打羽毛球",
        poll: "你最喜欢的爱好是？",
        pollOptions: ["运动", "音乐", "旅行"]
      },
      {
        id: "transport",
        label: "交通与出行",
        emoji: "🚌",
        words: [["坐车", "zuò chē", "Naik kendaraan"], ["公交车", "gōngjiāo chē", "Bus"], ["机场", "jīchǎng", "Bandara"], ["几点出发", "jǐ diǎn chūfā", "Jam berapa berangkat"], ["堵车", "dǔchē", "Macet"]],
        sentence: "我们坐公交车去学校",
        advanced: "因为堵车，我上课迟到了十分钟",
        poll: "你上学路上要多久？",
        pollOptions: ["十五分钟", "半小时", "一小时以上"]
      }
    ];
    const templateTypeLabels = {
      match: "连线配对",
      memory: "翻牌记忆",
      choice: "单选多选",
      order: "排序组句",
      fill: "填空",
      poll: "课堂投票"
    };
    const templateLevels = [
      { id: "beginner", label: "初级", size: 3 },
      { id: "intermediate", label: "中级", size: 4 },
      { id: "advanced", label: "高级", size: 5 }
    ];
    const templateItemId = (templateId) => `tpl-item-${templateId}`;

    function buildTemplateItem(templateId, type, topic, level) {
      const words = topic.words.slice(0, level.size);
      const base = {
        id: templateItemId(templateId),
        type,
        prompt: "请完成下面题目。",
        explanation: `来自模板库：${topic.label} · ${templateLevels.find((item) => item.id === level.id)?.label}`
      };
      if (type === "match" || type === "memory") {
        return {
          ...base,
          prompt: type === "match" ? `把${topic.label}的中文和印尼语配对。` : `翻开卡片，找到${topic.label}的配对。`,
          pairs: words.map((word, index) => ({ id: `${templateId}-pair-${index}`, left: word[0], right: word[2] }))
        };
      }
      if (type === "choice") {
        const correct = words[0];
        const distractors = ["Belum tahu", "Maaf", "Selamat malam", "Terima kasih", "Sampai besok"];
        const choices = [correct[2], ...distractors].slice(0, Math.max(3, level.size > 3 ? level.size : 3));
        return {
          ...base,
          prompt: `“${correct[0]}” 是什么意思？`,
          multiple: false,
          choices: choices.map((text, index) => ({ id: `${templateId}-choice-${index}`, text, isCorrect: text === correct[2] }))
        };
      }
      if (type === "order") {
        const sentence = level.id === "advanced" ? topic.advanced : topic.sentence;
        const parts = sentence.split(" ");
        return {
          ...base,
          prompt: "拖动词语，组成正确的句子。",
          orderItems: parts.map((text, index) => ({ id: `${templateId}-order-${index}`, text })),
          correctOrder: parts.map((_, index) => `${templateId}-order-${index}`)
        };
      }
      if (type === "fill") {
        const target = words[0];
        const sentence = level.id === "advanced" ? topic.advanced : topic.sentence;
        return {
          ...base,
          prompt: "填写缺失的词语。",
          sentence: sentence.replace(target[0], "____"),
          blanks: [{ id: `${templateId}-blank-0`, answers: [target[0], target[1]] }]
        };
      }
      return {
        ...base,
        prompt: topic.poll,
        pollOptions: topic.pollOptions.map((text, index) => ({ id: `${templateId}-poll-${index}`, text }))
      };
    }

    const interactionTemplates = [];
    templateTopics.forEach((topic) => {
      Object.keys(templateTypeLabels).forEach((type) => {
        templateLevels.forEach((level) => {
          const id = `${topic.id}-${type}-${level.id}`;
          interactionTemplates.push({
            id,
            type,
            title: `${topic.label} · ${templateTypeLabels[type]}`,
            summary: `${level.label}难度，${topic.label}主题的可直接套用${templateTypeLabels[type]}模板。`,
            topic: topic.label,
            topicId: topic.id,
            level: level.id,
            language: "zh-id",
            tags: [templateTypeLabels[type], topic.label, level.label, topic.emoji],
            item: buildTemplateItem(id, type, topic, level)
          });
        });
      });
    });

    /* 二期新题型（看图单选 / 图片—词语连线 / 情景选择 / 对话补全）用示例题写入模板库，
       内容按场景手写，避免自动生成把图片题做成重复图槽。 */
    const newTypeLabels = {
      picture: "看图单选",
      "picture-match": "图片—词语连线",
      situation: "情景选择",
      dialogue: "对话补全"
    };
    const newTypeTemplates = [
      {
        id: "tpl-scene-picture-greeting-beginner",
        type: "picture",
        topic: "问候与自我介绍",
        topicId: "greetings",
        level: "beginner",
        emoji: "👋",
        title: "问候图卡 · 看图选词",
        summary: "初级难度，看动作图卡选出对应的中文问候语。",
        item: {
          id: "tpl-scene-picture-greeting-beginner-item",
          type: "picture",
          prompt: "看图片，选出正确的问候语。",
          promptPinyin: "Kàn túpiàn, xuǎn chū zhèngquè de wènhòu yǔ.",
          explanation: "挥手打招呼用「你好」，道别用「再见」，道谢用「谢谢」。",
          media: { icon: "🖐️", image: "", alt: "一个人挥手打招呼" },
          choices: [
            { id: "pic-hi", text: "你好", hint: "nǐ hǎo", isCorrect: true },
            { id: "pic-bye", text: "再见", hint: "zàijiàn", isCorrect: false },
            { id: "pic-thanks", text: "谢谢", hint: "xièxie", isCorrect: false }
          ]
        }
      },
      {
        id: "tpl-scene-picture-time-intermediate",
        type: "picture",
        topic: "时间与日常",
        topicId: "time",
        level: "intermediate",
        emoji: "🌙",
        title: "时间图卡 · 看图选词",
        summary: "中级难度，根据图片判断一天中的时间段。",
        item: {
          id: "tpl-scene-picture-time-intermediate-item",
          type: "picture",
          prompt: "看图，这是哪个时间？",
          promptPinyin: "Kàn tú, zhè shì nǎge shíjiān?",
          explanation: "月亮和夜晚的图对应「晚上」；「早上」是日出前后，「中午」是十二点左右。",
          media: { icon: "🌙", image: "", alt: "夜晚的月亮和星星" },
          choices: [
            { id: "pic-night", text: "晚上", hint: "wǎnshang", isCorrect: true },
            { id: "pic-morning", text: "早上", hint: "zǎoshang", isCorrect: false },
            { id: "pic-noon", text: "中午", hint: "zhōngwǔ", isCorrect: false }
          ]
        }
      },
      {
        id: "tpl-scene-picture-transport-advanced",
        type: "picture",
        topic: "交通与出行",
        topicId: "transport",
        level: "advanced",
        emoji: "🚌",
        title: "出行图卡 · 看图选词",
        summary: "高级难度，看图选择出行方式并延伸到整句表达。",
        item: {
          id: "tpl-scene-picture-transport-advanced-item",
          type: "picture",
          prompt: "看图，他坐什么去学校？",
          promptPinyin: "Kàn tú, tā zuò shénme qù xuéxiào?",
          explanation: "公交车是 gōngjiāo chē；地铁是 dìtiě，飞机是 fēijī。",
          media: { icon: "🚌", image: "", alt: "一辆公交车" },
          choices: [
            { id: "pic-bus", text: "公交车", hint: "gōngjiāo chē", isCorrect: true },
            { id: "pic-metro", text: "地铁", hint: "dìtiě", isCorrect: false },
            { id: "pic-plane", text: "飞机", hint: "fēijī", isCorrect: false }
          ]
        }
      },
      {
        id: "tpl-scene-picture-match-greeting-beginner",
        type: "picture-match",
        topic: "问候与自我介绍",
        topicId: "greetings",
        level: "beginner",
        emoji: "🧩",
        title: "问候动作 · 图词连线",
        summary: "初级难度，把三张动作图卡和中文问候词配对。",
        item: {
          id: "tpl-scene-picture-match-greeting-beginner-item",
          type: "picture-match",
          prompt: "把图片和词语配成对。",
          explanation: "挥手是打招呼「你好」，合掌是道谢「谢谢」，挥手道别是「再见」。",
          pairs: [
            { id: "pm-hi", left: "挥手打招呼", right: "你好", rightPinyin: "nǐ hǎo", media: { icon: "🖐️", image: "", alt: "挥手打招呼" } },
            { id: "pm-thanks", left: "双手合十道谢", right: "谢谢", rightPinyin: "xièxie", media: { icon: "🙏", image: "", alt: "双手合十表示感谢" } },
            { id: "pm-bye", left: "挥手道别", right: "再见", rightPinyin: "zàijiàn", media: { icon: "👋", image: "", alt: "挥手道别" } }
          ]
        }
      },
      {
        id: "tpl-scene-picture-match-shopping-intermediate",
        type: "picture-match",
        topic: "购物与价格",
        topicId: "shopping",
        level: "intermediate",
        emoji: "🛍️",
        title: "买东西 · 图词连线",
        summary: "中级难度，把商品图和购物常用词配对。",
        item: {
          id: "tpl-scene-picture-match-shopping-intermediate-item",
          type: "picture-match",
          prompt: "把图片和词语配成对。",
          explanation: "苹果 píngguǒ、水 shuǐ、衣服 yīfu，配对后可以用「多少钱」问价格。",
          pairs: [
            { id: "pm-apple", left: "苹果", right: "苹果", rightPinyin: "píngguǒ", media: { icon: "🍎", image: "", alt: "一个红苹果" } },
            { id: "pm-water", left: "水", right: "水", rightPinyin: "shuǐ", media: { icon: "💧", image: "", alt: "一瓶水" } },
            { id: "pm-clothes", left: "衣服", right: "衣服", rightPinyin: "yīfu", media: { icon: "👕", image: "", alt: "一件衣服" } }
          ]
        }
      },
      {
        id: "tpl-scene-picture-match-direction-advanced",
        type: "picture-match",
        topic: "方位与问路",
        topicId: "direction",
        level: "advanced",
        emoji: "🧭",
        title: "方位图卡 · 图词连线",
        summary: "高级难度，把方位图标和中文方位词配对。",
        item: {
          id: "tpl-scene-picture-match-direction-advanced-item",
          type: "picture-match",
          prompt: "把方位图标和词语配成对。",
          explanation: "左边 zuǒbian、右边 yòubian、前面 qiánmiàn，可以用来回答问路。",
          pairs: [
            { id: "pm-left", left: "左边", right: "左边", rightPinyin: "zuǒbian", media: { icon: "⬅️", image: "", alt: "向左的箭头" } },
            { id: "pm-right", left: "右边", right: "右边", rightPinyin: "yòubian", media: { icon: "➡️", image: "", alt: "向右的箭头" } },
            { id: "pm-front", left: "前面", right: "前面", rightPinyin: "qiánmiàn", media: { icon: "⬆️", image: "", alt: "向前的箭头" } }
          ]
        }
      },
      {
        id: "tpl-scene-situation-greeting-beginner",
        type: "situation",
        topic: "问候与自我介绍",
        topicId: "greetings",
        level: "beginner",
        emoji: "🙋",
        title: "见到老师 · 情景选择",
        summary: "初级难度，判断早晨见到老师时最得体的说法。",
        item: {
          id: "tpl-scene-situation-greeting-beginner-item",
          type: "situation",
          prompt: "看场景，选出这个场合里最得体的说法。",
          explanation: "早上见到老师先说「老师好」，语气礼貌又清楚。",
          scene: "早上你在校门口遇到老师。",
          sceneTranslation: "Pagi-pagi kamu bertemu guru di gerbang sekolah.",
          media: { icon: "🏫", image: "", alt: "学校门口" },
          choices: [
            { id: "sit-greet", text: "老师好！", hint: "礼貌的问候", isCorrect: true },
            { id: "sit-rude", text: "喂，你在干嘛？", hint: "对老师太随便", isCorrect: false },
            { id: "sit-bye", text: "再见。", hint: "这是道别，不是问候", isCorrect: false }
          ]
        }
      },
      {
        id: "tpl-scene-situation-shopping-intermediate",
        type: "situation",
        topic: "购物与价格",
        topicId: "shopping",
        level: "intermediate",
        emoji: "🛍️",
        title: "问价格 · 情景选择",
        summary: "中级难度，练习在商店里礼貌询问价格。",
        item: {
          id: "tpl-scene-situation-shopping-intermediate-item",
          type: "situation",
          prompt: "看场景，选出这个场合里最得体的说法。",
          explanation: "问价格用「请问……多少钱」，先说「请问」更礼貌。",
          scene: "在商店里，你想知道这件衣服的价格。",
          sceneTranslation: "Di toko, kamu ingin tahu harga baju ini.",
          media: { icon: "👕", image: "", alt: "商店里的衣服" },
          choices: [
            { id: "sit-price", text: "请问，这件衣服多少钱？", hint: "礼貌地问价格", isCorrect: true },
            { id: "sit-blunt", text: "衣服！多少钱！", hint: "语气生硬，不礼貌", isCorrect: false },
            { id: "sit-irrelevant", text: "我要走了。", hint: "答非所问", isCorrect: false }
          ]
        }
      },
      {
        id: "tpl-scene-situation-direction-advanced",
        type: "situation",
        topic: "方位与问路",
        topicId: "direction",
        level: "advanced",
        emoji: "🧭",
        title: "向陌生人问路 · 情景选择",
        summary: "高级难度，练习向陌生人问路的得体表达。",
        item: {
          id: "tpl-scene-situation-direction-advanced-item",
          type: "situation",
          prompt: "看场景，选出这个场合里最得体的说法。",
          explanation: "向陌生人问路先说「请问」，再说明要去哪里。",
          scene: "你在路上想问陌生人地铁站怎么走。",
          sceneTranslation: "Kamu ingin bertanya arah ke stasiun MRT kepada orang asing.",
          media: { icon: "🚇", image: "", alt: "地铁站入口" },
          choices: [
            { id: "sit-ask", text: "请问，地铁站怎么走？", hint: "先请问再问路", isCorrect: true },
            { id: "sit-shout", text: "喂，地铁站！", hint: "称呼和语气都不礼貌", isCorrect: false },
            { id: "sit-nope", text: "我不知道。", hint: "你是问路的人，不该这样回答", isCorrect: false }
          ]
        }
      },
      {
        id: "tpl-scene-dialogue-greeting-beginner",
        type: "dialogue",
        topic: "问候与自我介绍",
        topicId: "greetings",
        level: "beginner",
        emoji: "💬",
        title: "第一次见面 · 对话补全",
        summary: "初级难度，接住「你叫什么名字」的提问。",
        item: {
          id: "tpl-scene-dialogue-greeting-beginner-item",
          type: "dialogue",
          prompt: "看上一句，选出合适的下一句。",
          explanation: "对方问名字，要用「我叫……」回答；「我很好」回答的是身体或心情。",
          dialogueThem: "你好！你叫什么名字？",
          dialoguePlaceholder: "？",
          choices: [
            { id: "dlg-name", text: "我叫 Anisa。", isCorrect: true },
            { id: "dlg-fine", text: "我很好，谢谢。", isCorrect: false },
            { id: "dlg-bye", text: "再见。", isCorrect: false }
          ]
        }
      },
      {
        id: "tpl-scene-dialogue-time-intermediate",
        type: "dialogue",
        topic: "时间与日常",
        topicId: "time",
        level: "intermediate",
        emoji: "🕒",
        title: "问时间 · 对话补全",
        summary: "中级难度，用时间词回答「现在几点」。",
        item: {
          id: "tpl-scene-dialogue-time-intermediate-item",
          type: "dialogue",
          prompt: "看上一句，选出合适的下一句。",
          explanation: "对方问时间，要用「现在 + 时间」回答，其他两句都接不上。",
          dialogueThem: "请问，现在几点？",
          dialoguePlaceholder: "？",
          choices: [
            { id: "dlg-time", text: "现在下午三点。", isCorrect: true },
            { id: "dlg-here", text: "我在这里。", isCorrect: false },
            { id: "dlg-tea", text: "我喜欢喝茶。", isCorrect: false }
          ]
        }
      },
      {
        id: "tpl-scene-dialogue-direction-advanced",
        type: "dialogue",
        topic: "方位与问路",
        topicId: "direction",
        level: "advanced",
        emoji: "🚻",
        title: "在哪儿 · 对话补全",
        summary: "高级难度，用方位说法回答位置提问。",
        item: {
          id: "tpl-scene-dialogue-direction-advanced-item",
          type: "dialogue",
          prompt: "看上一句，选出合适的下一句。",
          explanation: "上一句问的是「在哪儿」，所以要回答位置；B 是自我介绍，C 在说天气。",
          dialogueThem: "请问，洗手间在哪儿？",
          dialoguePlaceholder: "？",
          choices: [
            { id: "dlg-place", text: "在二楼，往左走。", isCorrect: true },
            { id: "dlg-me", text: "我叫小明。", isCorrect: false },
            { id: "dlg-hot", text: "今天很热。", isCorrect: false }
          ]
        }
      }
    ];
    newTypeTemplates.forEach((entry) => {
      interactionTemplates.push({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        summary: entry.summary,
        topic: entry.topic,
        topicId: entry.topicId,
        level: entry.level,
        language: "zh-id",
        tags: [
          newTypeLabels[entry.type],
          entry.topic,
          templateLevels.find((level) => level.id === entry.level)?.label ?? entry.level,
          entry.emoji
        ],
        item: entry.item
      });
    });

    /* 第三批新题型（拼音匹配 / 分类归组 / 拼字组词 / 找错误 / 听音选词 / 语音三兄弟）
       每个题型两个示例（初级 + 中级），字段与学生学习端同名页面一致。 */
    const batchThreeLabels = {
      "pinyin-match": "拼音—汉字—含义匹配",
      category: "分类归组",
      "word-build": "拼字 / 组词",
      correction: "找错误 / 改错",
      listening: "听音选图 / 选词",
      "read-aloud": "跟读模仿",
      "picture-talk": "看图说话",
      "open-qa": "开放问答"
    };

    function pinyinGroups(templateId, groups) {
      return groups.map((group, index) => Object.assign({ id: `${templateId}-group-${index}` }, group));
    }

    const batchThreeTemplates = [
      {
        id: "tpl-b3-pinyin-match-supplies-beginner",
        type: "pinyin-match",
        topic: "学习用品",
        topicId: "school",
        level: "beginner",
        emoji: "🔤",
        title: "学习用品 · 拼音匹配",
        summary: "初级难度，看拼音先选汉字，再选印尼语意思。",
        item: {
          id: "tpl-b3-pinyin-match-supplies-beginner-item",
          type: "pinyin-match",
          prompt: "看拼音，先选汉字，再选意思。",
          explanation: "书 shū、笔 bǐ、本子 běnzi：先听清拼音，再确认意思。",
          pinyinGroups: pinyinGroups("tpl-b3-pinyin-match-supplies-beginner", [
            { pinyin: "shū", word: "书", meaning: "buku", wordOptions: ["书", "笔", "本子"], meaningOptions: ["buku", "pena", "buku tulis"] },
            { pinyin: "bǐ", word: "笔", meaning: "pena", wordOptions: ["本子", "笔", "书"], meaningOptions: ["buku tulis", "pena", "buku"] },
            { pinyin: "běnzi", word: "本子", meaning: "buku tulis", wordOptions: ["书", "本子", "笔"], meaningOptions: ["pena", "buku tulis", "buku"] }
          ])
        }
      },
      {
        id: "tpl-b3-pinyin-match-time-intermediate",
        type: "pinyin-match",
        topic: "时间与日常",
        topicId: "time",
        level: "intermediate",
        emoji: "🕒",
        title: "今天什么时候 · 拼音匹配",
        summary: "中级难度，用一天里的三个时间词练习拼音、汉字和意思。",
        item: {
          id: "tpl-b3-pinyin-match-time-intermediate-item",
          type: "pinyin-match",
          prompt: "看拼音，先选汉字，再选意思。",
          explanation: "zǎoshang、zhōngwǔ、wǎnshang 是一天里的三个时间段。",
          pinyinGroups: pinyinGroups("tpl-b3-pinyin-match-time-intermediate", [
            { pinyin: "zǎoshang", word: "早上", meaning: "pagi", wordOptions: ["早上", "中午", "晚上"], meaningOptions: ["pagi", "siang", "malam"] },
            { pinyin: "zhōngwǔ", word: "中午", meaning: "siang", wordOptions: ["晚上", "中午", "早上"], meaningOptions: ["malam", "siang", "pagi"] },
            { pinyin: "wǎnshang", word: "晚上", meaning: "malam", wordOptions: ["中午", "早上", "晚上"], meaningOptions: ["siang", "pagi", "malam"] }
          ])
        }
      },
      {
        id: "tpl-b3-category-greeting-beginner",
        type: "category",
        topic: "问候与自我介绍",
        topicId: "greetings",
        level: "beginner",
        emoji: "📦",
        title: "见面与道别 · 分类归组",
        summary: "初级难度，把问候语和道别语分开放。",
        item: {
          id: "tpl-b3-category-greeting-beginner-item",
          type: "category",
          prompt: "把下面的词放到对应的类别里。",
          explanation: "见面说「你好」「早上好」，离开说「再见」「明天见」。",
          groups: [
            { id: "tpl-b3-category-greeting-beginner-g1", name: "见面时", hint: "见到老师和同学说" },
            { id: "tpl-b3-category-greeting-beginner-g2", name: "离开时", hint: "下课和放学时说" }
          ],
          words: [
            { id: "tpl-b3-category-greeting-beginner-w1", text: "你好", pinyin: "nǐ hǎo", group: "tpl-b3-category-greeting-beginner-g1" },
            { id: "tpl-b3-category-greeting-beginner-w2", text: "早上好", pinyin: "zǎoshang hǎo", group: "tpl-b3-category-greeting-beginner-g1" },
            { id: "tpl-b3-category-greeting-beginner-w3", text: "再见", pinyin: "zàijiàn", group: "tpl-b3-category-greeting-beginner-g2" },
            { id: "tpl-b3-category-greeting-beginner-w4", text: "明天见", pinyin: "míngtiān jiàn", group: "tpl-b3-category-greeting-beginner-g2" }
          ]
        }
      },
      {
        id: "tpl-b3-category-food-intermediate",
        type: "category",
        topic: "食物与口味",
        topicId: "food",
        level: "intermediate",
        emoji: "🍜",
        title: "吃的和喝的 · 分类归组",
        summary: "中级难度，按「吃」和「喝」给餐桌上的词分组。",
        item: {
          id: "tpl-b3-category-food-intermediate-item",
          type: "category",
          prompt: "把下面的词放到对应的类别里。",
          explanation: "「吃」后面接要嚼的食物，「喝」后面接液体；面条、米饭、饺子是食物，水和果汁是饮料。",
          groups: [
            { id: "tpl-b3-category-food-intermediate-g1", name: "吃的", hint: "用「吃」" },
            { id: "tpl-b3-category-food-intermediate-g2", name: "喝的", hint: "用「喝」" }
          ],
          words: [
            { id: "tpl-b3-category-food-intermediate-w1", text: "面条", pinyin: "miàntiáo", group: "tpl-b3-category-food-intermediate-g1" },
            { id: "tpl-b3-category-food-intermediate-w2", text: "米饭", pinyin: "mǐfàn", group: "tpl-b3-category-food-intermediate-g1" },
            { id: "tpl-b3-category-food-intermediate-w3", text: "饺子", pinyin: "jiǎozi", group: "tpl-b3-category-food-intermediate-g1" },
            { id: "tpl-b3-category-food-intermediate-w4", text: "水", pinyin: "shuǐ", group: "tpl-b3-category-food-intermediate-g2" },
            { id: "tpl-b3-category-food-intermediate-w5", text: "果汁", pinyin: "guǒzhī", group: "tpl-b3-category-food-intermediate-g2" }
          ]
        }
      },
      {
        id: "tpl-b3-word-build-mother-beginner",
        type: "word-build",
        topic: "家人与称呼",
        topicId: "family",
        level: "beginner",
        emoji: "🧱",
        title: "拼出「妈妈」 · 组词",
        summary: "初级难度，用重复字拼出「妈妈」，注意干扰字。",
        item: {
          id: "tpl-b3-word-build-mother-beginner-item",
          type: "word-build",
          prompt: "拼出这个词",
          meaning: "ibu",
          answer: ["妈", "妈"],
          answerWord: "妈妈",
          answerPinyin: "māma",
          tileBank: ["妈", "妈", "爸", "姐", "哥", "弟"],
          explanation: "「妈妈」两个字一样，读 māma；「爸爸」是 bàba，第一个字不一样。"
        }
      },
      {
        id: "tpl-b3-word-build-thanks-intermediate",
        type: "word-build",
        topic: "问候与自我介绍",
        topicId: "greetings",
        level: "intermediate",
        emoji: "🧱",
        title: "拼出「不客气」 · 组词",
        summary: "中级难度，拼出三个字的礼貌用语。",
        item: {
          id: "tpl-b3-word-build-thanks-intermediate-item",
          type: "word-build",
          prompt: "拼出这个词",
          meaning: "sama-sama",
          answer: ["不", "客", "气"],
          answerWord: "不客气",
          answerPinyin: "bú kèqi",
          tileBank: ["不", "客", "气", "谢", "你", "好"],
          explanation: "别人说「谢谢」，可以回答「不客气 bú kèqi」，意思是 sama-sama。"
        }
      },
      {
        id: "tpl-b3-correction-measure-beginner",
        type: "correction",
        topic: "学习用品",
        topicId: "school",
        level: "beginner",
        emoji: "🔍",
        title: "一本书 · 找错误",
        summary: "初级难度，点出句子里用错的量词。",
        item: {
          id: "tpl-b3-correction-measure-beginner-item",
          type: "correction",
          prompt: "下面这句话里有一个词用错了，点出来。",
          badWords: [
            { id: "tpl-b3-correction-measure-beginner-w1", text: "我", pinyin: "wǒ" },
            { id: "tpl-b3-correction-measure-beginner-w2", text: "买", pinyin: "mǎi" },
            { id: "tpl-b3-correction-measure-beginner-w3", text: "一", pinyin: "yī" },
            { id: "tpl-b3-correction-measure-beginner-w4", text: "个", pinyin: "gè", wrong: true },
            { id: "tpl-b3-correction-measure-beginner-w5", text: "书", pinyin: "shū" },
            { id: "tpl-b3-correction-measure-beginner-w6", text: "。", pinyin: "" }
          ],
          fixText: "本",
          fixedSentence: "我买一本书。",
          fixedPinyin: "Wǒ mǎi yì běn shū.",
          explanation: "「书」要用量词「本」——一本；「个」不能用在书上。"
        }
      },
      {
        id: "tpl-b3-correction-time-intermediate",
        type: "correction",
        topic: "时间与日期",
        topicId: "time",
        level: "intermediate",
        emoji: "🕒",
        title: "几点上课 · 找错误",
        summary: "中级难度，找出时间表达里的错误。",
        item: {
          id: "tpl-b3-correction-time-intermediate-item",
          type: "correction",
          prompt: "下面这句话里有一个词用错了，点出来。",
          badWords: [
            { id: "tpl-b3-correction-time-intermediate-w1", text: "我们", pinyin: "wǒmen" },
            { id: "tpl-b3-correction-time-intermediate-w2", text: "下午", pinyin: "xiàwǔ" },
            { id: "tpl-b3-correction-time-intermediate-w3", text: "点", pinyin: "diǎn", wrong: true },
            { id: "tpl-b3-correction-time-intermediate-w4", text: "三", pinyin: "sān" },
            { id: "tpl-b3-correction-time-intermediate-w5", text: "上课", pinyin: "shàngkè" },
            { id: "tpl-b3-correction-time-intermediate-w6", text: "。", pinyin: "" }
          ],
          fixText: "三点",
          fixedSentence: "我们下午三点上课。",
          fixedPinyin: "Wǒmen xiàwǔ sān diǎn shàngkè.",
          explanation: "钟点要说「三点」，「点」放在数字后面，不能单独放在「三」前面。"
        }
      },
      {
        id: "tpl-b3-listening-tone-beginner",
        type: "listening",
        topic: "数字与年龄",
        topicId: "number",
        level: "beginner",
        emoji: "🔊",
        title: "听声调选字 · 听音选词",
        summary: "初级难度，听一个音节，选出声调正确的汉字。",
        item: {
          id: "tpl-b3-listening-tone-beginner-item",
          type: "listening",
          prompt: "听一听，选出你听到的",
          audioSrc: "",
          audioText: "三",
          audioPinyin: "sān",
          choices: [
            { id: "tpl-b3-listening-tone-beginner-c1", text: "三", hint: "sān", isCorrect: true },
            { id: "tpl-b3-listening-tone-beginner-c2", text: "四", hint: "sì", isCorrect: false },
            { id: "tpl-b3-listening-tone-beginner-c3", text: "山", hint: "shān", isCorrect: false },
            { id: "tpl-b3-listening-tone-beginner-c4", text: "伞", hint: "sǎn", isCorrect: false }
          ],
          explanation: "三 sān 是第一声，读得又平又高；四 sì 是第四声，往下掉。"
        }
      },
      {
        id: "tpl-b3-listening-water-intermediate",
        type: "listening",
        topic: "食物与口味",
        topicId: "food",
        level: "intermediate",
        emoji: "🔊",
        title: "听句子选短语 · 听音选词",
        summary: "中级难度，听一个短句，选出听到的短语。",
        item: {
          id: "tpl-b3-listening-water-intermediate-item",
          type: "listening",
          prompt: "听一听，选出你听到的内容",
          audioSrc: "",
          audioText: "我要喝水",
          audioPinyin: "wǒ yào hē shuǐ",
          choices: [
            { id: "tpl-b3-listening-water-intermediate-c1", text: "我要喝水", hint: "wǒ yào hē shuǐ", isCorrect: true },
            { id: "tpl-b3-listening-water-intermediate-c2", text: "我要吃饭", hint: "wǒ yào chī fàn", isCorrect: false },
            { id: "tpl-b3-listening-water-intermediate-c3", text: "我不要辣", hint: "wǒ bú yào là", isCorrect: false }
          ],
          explanation: "「喝水 hē shuǐ」是喝液体；「吃饭 chī fàn」是吃食物。"
        }
      },
      {
        id: "tpl-b3-read-aloud-nihao-beginner",
        type: "read-aloud",
        topic: "问候与自我介绍",
        topicId: "greetings",
        level: "beginner",
        emoji: "🎤",
        title: "跟读「你好」 · 跟读模仿",
        summary: "初级难度，听范读后跟读两个第三声的字。",
        item: {
          id: "tpl-b3-read-aloud-nihao-beginner-item",
          type: "read-aloud",
          prompt: "听一遍，然后跟着读",
          sentence: "你好",
          promptPinyin: "nǐ hǎo",
          audioSrc: "",
          explanation: "「你好」两个字都是第三声，连读时前一个字会变成第二声。",
          scores: [
            { id: "tpl-b3-read-aloud-nihao-beginner-s1", label: "发音", stars: 3 },
            { id: "tpl-b3-read-aloud-nihao-beginner-s2", label: "流利度", stars: 4 },
            { id: "tpl-b3-read-aloud-nihao-beginner-s3", label: "声调", stars: 3 }
          ]
        }
      },
      {
        id: "tpl-b3-read-aloud-time-intermediate",
        type: "read-aloud",
        topic: "时间与日常",
        topicId: "time",
        level: "intermediate",
        emoji: "🎤",
        title: "跟读「我们下午三点上课」 · 跟读模仿",
        summary: "中级难度，跟读一整句时间表达。",
        item: {
          id: "tpl-b3-read-aloud-time-intermediate-item",
          type: "read-aloud",
          prompt: "听一遍，然后跟着读",
          sentence: "我们下午三点上课",
          promptPinyin: "Wǒmen xiàwǔ sān diǎn shàngkè.",
          audioSrc: "",
          explanation: "时间词放在动词前面：「下午三点」＋「上课」。",
          scores: [
            { id: "tpl-b3-read-aloud-time-intermediate-s1", label: "发音", stars: 3 },
            { id: "tpl-b3-read-aloud-time-intermediate-s2", label: "流利度", stars: 3 },
            { id: "tpl-b3-read-aloud-time-intermediate-s3", label: "声调", stars: 4 }
          ]
        }
      },
      {
        id: "tpl-b3-picture-talk-running-beginner",
        type: "picture-talk",
        topic: "动作与日常",
        topicId: "action",
        level: "beginner",
        emoji: "🗣️",
        title: "小朋友在跑步 · 看图说话",
        summary: "初级难度，看图用「谁 ＋ 做什么」说一句话。",
        item: {
          id: "tpl-b3-picture-talk-running-beginner-item",
          type: "picture-talk",
          prompt: "看这张图，用中文说一句话。",
          speakingHint: "试试说：谁 ＋ 在做什么",
          media: { icon: "🏃", image: "", alt: "一个小朋友在跑步" },
          mediaTranslation: "Seorang anak sedang berlari.",
          sampleAnswer: "小朋友在跑步。",
          sampleAnswerPinyin: "Xiǎopéngyou zài pǎobù.",
          explanation: "中文说「谁 ＋ 在 ＋ 做什么」：小朋友 ＋ 在 ＋ 跑步。",
          scores: [
            { id: "tpl-b3-picture-talk-running-beginner-s1", label: "内容", stars: 3 },
            { id: "tpl-b3-picture-talk-running-beginner-s2", label: "完整度", stars: 3 },
            { id: "tpl-b3-picture-talk-running-beginner-s3", label: "发音", stars: 3 }
          ]
        }
      },
      {
        id: "tpl-b3-picture-talk-weather-intermediate",
        type: "picture-talk",
        topic: "天气与季节",
        topicId: "weather",
        level: "intermediate",
        emoji: "🌧️",
        title: "下雨了 · 看图说话",
        summary: "中级难度，看图说天气，并加一句提醒。",
        item: {
          id: "tpl-b3-picture-talk-weather-intermediate-item",
          type: "picture-talk",
          prompt: "看这张图，用中文说两句话。",
          speakingHint: "第一句说天气，第二句说怎么办",
          media: { icon: "🌧️", image: "", alt: "下雨天，一个人打着伞" },
          mediaTranslation: "Hari hujan, seseorang memakai payung.",
          sampleAnswer: "今天下雨了，记得带伞。",
          sampleAnswerPinyin: "Jīntiān xià yǔ le, jìde dài sǎn.",
          explanation: "先说天气「下雨」，再说建议「带伞」。",
          scores: [
            { id: "tpl-b3-picture-talk-weather-intermediate-s1", label: "内容", stars: 4 },
            { id: "tpl-b3-picture-talk-weather-intermediate-s2", label: "完整度", stars: 4 },
            { id: "tpl-b3-picture-talk-weather-intermediate-s3", label: "发音", stars: 3 }
          ]
        }
      },
      {
        id: "tpl-b3-open-qa-weekend-beginner",
        type: "open-qa",
        topic: "爱好与周末",
        topicId: "hobby",
        level: "beginner",
        emoji: "❓",
        title: "周末喜欢做什么 · 开放问答",
        summary: "初级难度，套用「我周末喜欢……」回答问题。",
        item: {
          id: "tpl-b3-open-qa-weekend-beginner-item",
          type: "open-qa",
          prompt: "你周末喜欢做什么？",
          speakingWords: [
            { id: "tpl-b3-open-qa-weekend-beginner-h1", text: "听音乐", pinyin: "tīng yīnyuè" },
            { id: "tpl-b3-open-qa-weekend-beginner-h2", text: "打篮球", pinyin: "dǎ lánqiú" },
            { id: "tpl-b3-open-qa-weekend-beginner-h3", text: "和朋友玩", pinyin: "hé péngyou wán" }
          ],
          sampleAnswer: "我周末喜欢听音乐。",
          sampleAnswerPinyin: "Wǒ zhōumò xǐhuan tīng yīnyuè.",
          samplePattern: "我周末喜欢 ______ 。",
          explanation: "用「我周末喜欢 ＋ 活动」就能完整回答这个问题。",
          scores: [
            { id: "tpl-b3-open-qa-weekend-beginner-s1", label: "内容", stars: 3 },
            { id: "tpl-b3-open-qa-weekend-beginner-s2", label: "完整度", stars: 3 },
            { id: "tpl-b3-open-qa-weekend-beginner-s3", label: "发音", stars: 3 }
          ]
        }
      },
      {
        id: "tpl-b3-open-qa-food-intermediate",
        type: "open-qa",
        topic: "食物与口味",
        topicId: "food",
        level: "intermediate",
        emoji: "❓",
        title: "最喜欢的中国菜 · 开放问答",
        summary: "中级难度，说出喜欢的菜并补一句理由。",
        item: {
          id: "tpl-b3-open-qa-food-intermediate-item",
          type: "open-qa",
          prompt: "你最喜欢哪一样中国菜？为什么？",
          speakingWords: [
            { id: "tpl-b3-open-qa-food-intermediate-h1", text: "饺子", pinyin: "jiǎozi" },
            { id: "tpl-b3-open-qa-food-intermediate-h2", text: "面条", pinyin: "miàntiáo" },
            { id: "tpl-b3-open-qa-food-intermediate-h3", text: "很好吃", pinyin: "hěn hǎochī" },
            { id: "tpl-b3-open-qa-food-intermediate-h4", text: "不太辣", pinyin: "bú tài là" }
          ],
          sampleAnswer: "我最喜欢饺子，因为它很好吃。",
          sampleAnswerPinyin: "Wǒ zuì xǐhuan jiǎozi, yīnwèi tā hěn hǎochī.",
          samplePattern: "我最喜欢 ______ ，因为 ______ 。",
          explanation: "先说喜欢的菜，再用「因为……」补上理由，答案更完整。",
          scores: [
            { id: "tpl-b3-open-qa-food-intermediate-s1", label: "内容", stars: 4 },
            { id: "tpl-b3-open-qa-food-intermediate-s2", label: "完整度", stars: 4 },
            { id: "tpl-b3-open-qa-food-intermediate-s3", label: "发音", stars: 3 }
          ]
        }
      }
    ];

    batchThreeTemplates.forEach((entry) => {
      interactionTemplates.push({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        summary: entry.summary,
        topic: entry.topic,
        topicId: entry.topicId,
        level: entry.level,
        language: "zh-id",
        tags: [
          batchThreeLabels[entry.type],
          entry.topic,
          templateLevels.find((level) => level.id === entry.level)?.label ?? entry.level,
          entry.emoji
        ],
        item: entry.item
      });
    });

    const interactionSets = [
      {
        id: "set-greetings-preview",
        lessonId: "lesson-greetings",
        title: "问候热身",
        description: "预约后完成的选择题和填空，帮助学生在课前熟悉关键词。",
        phase: "preview",
        status: "published",
        currentVersionId: "ver-greetings-preview-2",
        order: 1,
        updatedAt: iso(addDays(now, -4))
      },
      {
        id: "set-greetings-live",
        lessonId: "lesson-greetings",
        title: "课堂互动 · 问候时间",
        description: "连线与翻牌两类快速互动，适合大班课同步作答。",
        phase: "live",
        status: "published",
        currentVersionId: "ver-greetings-live-1",
        order: 1,
        updatedAt: iso(addDays(now, -6))
      },
      {
        id: "set-greetings-review",
        lessonId: "lesson-greetings",
        title: "课后复习挑战",
        description: "排序和投票，检查学生是否能主动组织表达。",
        phase: "review",
        status: "published",
        currentVersionId: "ver-greetings-review-1",
        order: 1,
        updatedAt: iso(addDays(now, -6))
      },
      {
        id: "set-greetings-scenario",
        lessonId: "lesson-greetings",
        title: "情景演练 · 看图与对话",
        description: "看图单选、图片—词语连线、情景选择和对话补全，四道新题型一次体验。",
        phase: "live",
        status: "published",
        currentVersionId: "ver-greetings-scenario-1",
        order: 2,
        updatedAt: iso(addDays(now, -3))
      },
      {
        id: "set-greetings-batch-three",
        lessonId: "lesson-greetings",
        title: "互动体验 · 八大新题型",
        description: "分类归组、拼字组词、找错误、拼音匹配、听音选词和三个语音题型，一次体验全部新玩法。",
        phase: "live",
        status: "published",
        currentVersionId: "ver-greetings-batch-three-1",
        order: 3,
        updatedAt: iso(addDays(now, -2))
      },
      {
        id: "set-time-preview",
        lessonId: "lesson-time",
        title: "时间词预习",
        description: "通过选择题认识上午、中午、下午和晚上。",
        phase: "preview",
        status: "published",
        currentVersionId: "ver-time-preview-1",
        order: 1,
        updatedAt: iso(addDays(now, -2))
      }
    ];

    const interactionVersions = [
      {
        id: "ver-greetings-preview-1",
        setId: "set-greetings-preview",
        version: 1,
        status: "archived",
        publishedAt: iso(addDays(now, -8)),
        publishedBy: "teacher-lina",
        publishNote: "初版",
        items: []
      },
      {
        id: "ver-greetings-preview-2",
        setId: "set-greetings-preview",
        version: 2,
        status: "published",
        publishedAt: iso(addDays(now, -4)),
        publishedBy: "teacher-lina",
        publishNote: "补充了“早上好”填空题与印尼语解释。",
        items: [
          {
            id: "item-preview-choice",
            type: "choice",
            prompt: "“你好”最接近哪一种印尼语表达？",
            explanation: "“你好”是通用问候，适合初次见面。",
            multiple: false,
            choices: [
              { id: "c1", text: "Halo", isCorrect: true },
              { id: "c2", text: "Terima kasih", isCorrect: false },
              { id: "c3", text: "Selamat tidur", isCorrect: false }
            ]
          },
          {
            id: "item-preview-fill",
            type: "fill",
            prompt: "早上见面时说：____ 好！",
            explanation: "“早上好”是早晨问候。",
            sentence: "____ 好！",
            blanks: [{ id: "b1", answers: ["早上", "zao shang"] }]
          }
        ]
      },
      {
        id: "ver-greetings-live-1",
        setId: "set-greetings-live",
        version: 1,
        status: "published",
        publishedAt: iso(addDays(now, -6)),
        publishedBy: "teacher-lina",
        publishNote: "首版课堂互动",
        items: [
          {
            id: "item-live-match",
            type: "match",
            prompt: "把中文问候与印尼语意思连起来。",
            explanation: "先看中文，再选择对应的印尼语。",
            pairs: [
              { id: "p1", left: "你好", right: "Halo" },
              { id: "p2", left: "老师好", right: "Halo, Guru" },
              { id: "p3", left: "大家好", right: "Halo semuanya" },
              { id: "p4", left: "再见", right: "Sampai jumpa" }
            ]
          },
          {
            id: "item-live-memory",
            type: "memory",
            prompt: "翻开卡片，找到中文和印尼语配对。",
            explanation: "记住卡片位置，可以帮助快速回忆词汇。",
            pairs: [
              { id: "m1", left: "早上", right: "Pagi" },
              { id: "m2", left: "中午", right: "Siang" },
              { id: "m3", left: "下午", right: "Sore" },
              { id: "m4", left: "晚上", right: "Malam" }
            ]
          }
        ]
      },
      {
        id: "ver-greetings-review-1",
        setId: "set-greetings-review",
        version: 1,
        status: "published",
        publishedAt: iso(addDays(now, -6)),
        publishedBy: "teacher-lina",
        publishNote: "首版课后复习",
        items: [
          {
            id: "item-review-order",
            type: "order",
            prompt: "把句子排成自然的中文问候。",
            explanation: "中文自我介绍常按“你好，我是……，很高兴认识你”的顺序。",
            orderItems: [
              { id: "o1", text: "你好" },
              { id: "o2", text: "我是 Anisa" },
              { id: "o3", text: "很高兴认识你" }
            ],
            correctOrder: ["o1", "o2", "o3"]
          },
          {
            id: "item-review-poll",
            type: "poll",
            prompt: "今天哪个互动最有挑战？",
            explanation: "投票不评分，用于老师了解课堂体验。",
            pollOptions: [
              { id: "poll1", text: "连线配对" },
              { id: "poll2", text: "翻牌记忆" },
              { id: "poll3", text: "开口表达" }
            ]
          }
        ]
      },
      {
        id: "ver-greetings-scenario-1",
        setId: "set-greetings-scenario",
        version: 1,
        status: "published",
        publishedAt: iso(addDays(now, -3)),
        publishedBy: "teacher-lina",
        publishNote: "新增看图单选、图片连线、情景选择和对话补全四道题型。",
        items: [
          {
            id: "item-scenario-picture",
            type: "picture",
            prompt: "看图，这是什么？",
            promptPinyin: "Kàn tú, zhè shì shénme?",
            explanation: "「猫」是 māo，是家里常见的小动物。",
            media: { icon: "🐱", image: "", alt: "一只猫" },
            choices: [
              { id: "sc-pic-cat", text: "猫", hint: "māo", isCorrect: true },
              { id: "sc-pic-dog", text: "狗", hint: "gǒu", isCorrect: false },
              { id: "sc-pic-bird", text: "鸟", hint: "niǎo", isCorrect: false }
            ]
          },
          {
            id: "item-scenario-picture-match",
            type: "picture-match",
            prompt: "把图片和词语配成对。",
            explanation: "学校 xué xiào、医院 yī yuàn、商店 shāng diàn、公园 gōng yuán。",
            pairs: [
              { id: "sc-pm-school", left: "学校", right: "学校", rightPinyin: "xué xiào", media: { icon: "🏫", image: "", alt: "学校的教学楼" } },
              { id: "sc-pm-hospital", left: "医院", right: "医院", rightPinyin: "yī yuàn", media: { icon: "🏥", image: "", alt: "医院的大楼" } },
              { id: "sc-pm-shop", left: "商店", right: "商店", rightPinyin: "shāng diàn", media: { icon: "🏪", image: "", alt: "商店的门面" } },
              { id: "sc-pm-park", left: "公园", right: "公园", rightPinyin: "gōng yuán", media: { icon: "🌳", image: "", alt: "公园里的大树" } }
            ]
          },
          {
            id: "item-scenario-situation",
            type: "situation",
            prompt: "看场景，选出这个场合里最得体的说法。",
            explanation: "向别人借东西要用「请问……可以吗」。",
            scene: "你想借同学的笔。",
            sceneTranslation: "Kamu mau meminjam pulpen temanmu.",
            media: { icon: "✏️", image: "", alt: "一支铅笔" },
            choices: [
              { id: "sc-sit-rude", text: "喂，给我笔！", hint: "太生硬", isCorrect: false },
              { id: "sc-sit-polite", text: "请问，我可以借你的笔吗？", hint: "先请问，再提出请求", isCorrect: true },
              { id: "sc-sit-blunt", text: "笔。", hint: "话没说完", isCorrect: false }
            ]
          },
          {
            id: "item-scenario-dialogue",
            type: "dialogue",
            prompt: "选出合适的下一句。",
            explanation: "上一句问的是「在哪儿」，所以要回答位置；另外两句接不上。",
            dialogueThem: "请问，洗手间在哪儿？",
            dialoguePlaceholder: "？",
            choices: [
              { id: "sc-dlg-place", text: "在二楼，往左走。", isCorrect: true },
              { id: "sc-dlg-name", text: "我叫小明。", isCorrect: false },
              { id: "sc-dlg-weather", text: "今天很热。", isCorrect: false }
            ]
          }
        ]
      },
      {
        id: "ver-greetings-batch-three-1",
        setId: "set-greetings-batch-three",
        version: 1,
        status: "published",
        publishedAt: iso(addDays(now, -2)),
        publishedBy: "teacher-lina",
        publishNote: "新增八类题型：拼音匹配、分类归组、拼字组词、找错误、听音选词、跟读、看图说话、开放问答。",
        items: [
          {
            id: "item-batch3-category",
            type: "category",
            prompt: "把下面的词放到对应的类别里。",
            explanation: "「吃」后面接要嚼的食物，「喝」后面接液体。",
            groups: [
              { id: "batch3-cat-eat", name: "吃的", hint: "用「吃」" },
              { id: "batch3-cat-drink", name: "喝的", hint: "用「喝」" }
            ],
            words: [
              { id: "batch3-cat-w1", text: "饺子", pinyin: "jiǎozi", group: "batch3-cat-eat" },
              { id: "batch3-cat-w2", text: "米饭", pinyin: "mǐfàn", group: "batch3-cat-eat" },
              { id: "batch3-cat-w3", text: "水", pinyin: "shuǐ", group: "batch3-cat-drink" },
              { id: "batch3-cat-w4", text: "果汁", pinyin: "guǒzhī", group: "batch3-cat-drink" }
            ]
          },
          {
            id: "item-batch3-word-build",
            type: "word-build",
            prompt: "拼出这个词",
            meaning: "ibu",
            answer: ["妈", "妈"],
            answerWord: "妈妈",
            answerPinyin: "māma",
            tileBank: ["妈", "妈", "爸", "姐", "哥", "弟"],
            explanation: "「妈妈」两个字一样，读 māma；「爸爸」是 bàba。"
          },
          {
            id: "item-batch3-correction",
            type: "correction",
            prompt: "下面这句话里有一个词用错了，点出来。",
            badWords: [
              { id: "batch3-fix-w1", text: "我", pinyin: "wǒ" },
              { id: "batch3-fix-w2", text: "买", pinyin: "mǎi" },
              { id: "batch3-fix-w3", text: "一", pinyin: "yī" },
              { id: "batch3-fix-w4", text: "个", pinyin: "gè", wrong: true },
              { id: "batch3-fix-w5", text: "书", pinyin: "shū" },
              { id: "batch3-fix-w6", text: "。", pinyin: "" }
            ],
            fixText: "本",
            fixedSentence: "我买一本书。",
            fixedPinyin: "Wǒ mǎi yì běn shū.",
            explanation: "「书」要用量词「本」——一本。"
          },
          {
            id: "item-batch3-pinyin-match",
            type: "pinyin-match",
            prompt: "看拼音，先选汉字，再选意思。",
            explanation: "书 shū、笔 bǐ、本子 běnzi：先听清拼音，再确认意思。",
            pinyinGroups: [
              { id: "batch3-py-g1", pinyin: "shū", word: "书", meaning: "buku", wordOptions: ["书", "笔", "本子"], meaningOptions: ["buku", "pena", "buku tulis"] },
              { id: "batch3-py-g2", pinyin: "bǐ", word: "笔", meaning: "pena", wordOptions: ["本子", "笔", "书"], meaningOptions: ["buku tulis", "pena", "buku"] },
              { id: "batch3-py-g3", pinyin: "běnzi", word: "本子", meaning: "buku tulis", wordOptions: ["书", "本子", "笔"], meaningOptions: ["pena", "buku tulis", "buku"] }
            ]
          },
          {
            id: "item-batch3-listening",
            type: "listening",
            prompt: "听一听，选出你听到的",
            audioSrc: "",
            audioText: "三",
            audioPinyin: "sān",
            choices: [
              { id: "batch3-listen-c1", text: "三", hint: "sān", isCorrect: true },
              { id: "batch3-listen-c2", text: "四", hint: "sì", isCorrect: false },
              { id: "batch3-listen-c3", text: "山", hint: "shān", isCorrect: false },
              { id: "batch3-listen-c4", text: "伞", hint: "sǎn", isCorrect: false }
            ],
            explanation: "三 sān 是第一声，读得又平又高；四 sì 是第四声。"
          },
          {
            id: "item-batch3-read-aloud",
            type: "read-aloud",
            prompt: "听一遍，然后跟着读",
            sentence: "你好",
            promptPinyin: "nǐ hǎo",
            audioSrc: "",
            explanation: "「你好」两个字都是第三声，连读时前一个字会变成第二声。",
            scores: [
              { id: "batch3-ra-s1", label: "发音", stars: 3 },
              { id: "batch3-ra-s2", label: "流利度", stars: 4 },
              { id: "batch3-ra-s3", label: "声调", stars: 3 }
            ]
          },
          {
            id: "item-batch3-picture-talk",
            type: "picture-talk",
            prompt: "看这张图，用中文说一句话。",
            speakingHint: "试试说：谁 ＋ 在做什么",
            media: { icon: "🏃", image: "", alt: "一个小朋友在跑步" },
            mediaTranslation: "Seorang anak sedang berlari.",
            sampleAnswer: "小朋友在跑步。",
            sampleAnswerPinyin: "Xiǎopéngyou zài pǎobù.",
            explanation: "中文说「谁 ＋ 在 ＋ 做什么」：小朋友 ＋ 在 ＋ 跑步。",
            scores: [
              { id: "batch3-pt-s1", label: "内容", stars: 3 },
              { id: "batch3-pt-s2", label: "完整度", stars: 3 },
              { id: "batch3-pt-s3", label: "发音", stars: 3 }
            ]
          },
          {
            id: "item-batch3-open-qa",
            type: "open-qa",
            prompt: "你周末喜欢做什么？",
            speakingWords: [
              { id: "batch3-oq-h1", text: "听音乐", pinyin: "tīng yīnyuè" },
              { id: "batch3-oq-h2", text: "打篮球", pinyin: "dǎ lánqiú" },
              { id: "batch3-oq-h3", text: "和朋友玩", pinyin: "hé péngyou wán" }
            ],
            sampleAnswer: "我周末喜欢听音乐。",
            sampleAnswerPinyin: "Wǒ zhōumò xǐhuan tīng yīnyuè.",
            samplePattern: "我周末喜欢 ______ 。",
            explanation: "用「我周末喜欢 ＋ 活动」就能完整回答这个问题。",
            scores: [
              { id: "batch3-oq-s1", label: "内容", stars: 3 },
              { id: "batch3-oq-s2", label: "完整度", stars: 3 },
              { id: "batch3-oq-s3", label: "发音", stars: 3 }
            ]
          }
        ]
      },
      {
        id: "ver-time-preview-1",
        setId: "set-time-preview",
        version: 1,
        status: "published",
        publishedAt: iso(addDays(now, -2)),
        publishedBy: "teacher-berenice",
        publishNote: "首版",
        items: [
          {
            id: "item-time-choice",
            type: "choice",
            prompt: "“晚上 8 点”的“晚上”是什么意思？",
            explanation: "“晚上”表示大概 18:00 之后的夜晚时段。",
            multiple: false,
            choices: [
              { id: "t1", text: "Malam", isCorrect: true },
              { id: "t2", text: "Pagi", isCorrect: false },
              { id: "t3", text: "Siang", isCorrect: false }
            ]
          }
        ]
      }
    ];

    const interactionAttempts = [
      {
        id: "attempt-anisa-preview-greetings",
        setId: "set-greetings-preview",
        versionId: "ver-greetings-preview-2",
        studentId: "student-anisa",
        sessionId: "session-past",
        phase: "preview",
        score: 100,
        bestScore: 100,
        attempt: 1,
        timeSpentSeconds: 96,
        completedAt: iso(addDays(now, -2)),
        answers: {},
        wrongItemIds: [],
        pollAnswers: {}
      },
      {
        id: "attempt-anisa-live-greetings",
        setId: "set-greetings-live",
        versionId: "ver-greetings-live-1",
        studentId: "student-anisa",
        sessionId: "session-past",
        phase: "live",
        score: 75,
        bestScore: 75,
        attempt: 1,
        timeSpentSeconds: 142,
        completedAt: iso(addDays(now, -1)),
        answers: {},
        wrongItemIds: ["item-live-memory"],
        pollAnswers: {}
      }
    ];

    const materials = [
      {
        id: "material-preview-pdf",
        title: "课前词汇卡：你好、早上好、再见",
        description: "带拼音和印尼语释义的 PDF 词汇卡。",
        kind: "file",
        fileType: "pdf",
        language: "zh-id",
        ownerId: "teacher-lina",
        status: "published",
        currentVersion: 2,
        downloadCount: 18,
        createdAt: iso(addDays(now, -12)),
        versions: [
          {
            version: 1,
            fileName: "greeting-preview-v1.pdf",
            sizeLabel: "18 KB",
            url: "/shared/demo-materials/greeting-preview.pdf",
            publishedAt: iso(addDays(now, -12))
          },
          {
            version: 2,
            fileName: "greeting-preview.pdf",
            sizeLabel: "24 KB",
            url: "/shared/demo-materials/greeting-preview.pdf",
            publishedAt: iso(addDays(now, -4))
          }
        ]
      },
      {
        id: "material-live-slides",
        title: "课堂互动投影提示",
        description: "包含课堂节奏和互动提示语的演示文件。",
        kind: "file",
        fileType: "pptx",
        language: "zh-id",
        ownerId: "teacher-lina",
        status: "published",
        currentVersion: 1,
        downloadCount: 6,
        createdAt: iso(addDays(now, -6)),
        versions: [
          {
            version: 1,
            fileName: "greeting-classroom-deck.pptx",
            sizeLabel: "36 KB",
            url: "/shared/demo-materials/greeting-classroom-deck.pptx",
            publishedAt: iso(addDays(now, -6))
          }
        ]
      },
      {
        id: "material-review-audio",
        title: "课后跟读音频",
        description: "学生可以反复播放并跟读四组问候。",
        kind: "file",
        fileType: "wav",
        language: "zh-id",
        ownerId: "teacher-berenice",
        status: "published",
        currentVersion: 1,
        downloadCount: 12,
        createdAt: iso(addDays(now, -5)),
        versions: [
          {
            version: 1,
            fileName: "greeting-review.wav",
            sizeLabel: "84 KB",
            url: "/shared/demo-materials/greeting-review.wav",
            publishedAt: iso(addDays(now, -5))
          }
        ]
      },
      {
        id: "material-friends-preview",
        title: "认识新朋友 · 互动课件",
        description: "包含词汇点读、选择练习和句子排序的课前互动课件。",
        kind: "courseware",
        fileType: "html",
        language: "zh-id",
        ownerId: "teacher-berenice",
        status: "published",
        currentVersion: 1,
        downloadCount: 5,
        createdAt: iso(addDays(now, -2)),
        versions: [
          {
            version: 1,
            fileName: "friends-courseware.html",
            sizeLabel: "互动课件",
            url: "/shared/demo-materials/friends-courseware.html",
            publishedAt: iso(addDays(now, -2))
          }
        ]
      },
      {
        id: "material-time-courseware",
        title: "现在几点？· 互动课件",
        description: "时间词点读、钟表读法、时间配对和句子排序，可在课前预习时播放。",
        kind: "courseware",
        fileType: "html",
        language: "zh-id",
        ownerId: "teacher-lina",
        status: "published",
        currentVersion: 1,
        downloadCount: 3,
        createdAt: iso(addDays(now, -3)),
        versions: [
          {
            version: 1,
            fileName: "time-courseware.html",
            sizeLabel: "互动课件",
            url: "/shared/demo-materials/time-courseware.html",
            publishedAt: iso(addDays(now, -3))
          }
        ]
      },
      {
        id: "material-time-review-sheet",
        title: "现在几点？· 课后复习单",
        description: "两页可打印复习单：时间词、句型、我会说、选一选、连一连和语音作业。",
        kind: "file",
        fileType: "pdf",
        language: "zh-id",
        ownerId: "teacher-lina",
        status: "published",
        currentVersion: 1,
        downloadCount: 2,
        createdAt: iso(addDays(now, -2)),
        versions: [
          {
            version: 1,
            fileName: "time-review-sheet.pdf",
            sizeLabel: "62 KB",
            url: "/shared/demo-materials/time-review-sheet.pdf",
            publishedAt: iso(addDays(now, -2))
          }
        ]
      },
      {
        id: "material-time-review-audio",
        title: "时间句型跟读音频",
        description: "四组时间句型的跟读示范音频，学生可以反复播放并录音上传。",
        kind: "file",
        fileType: "wav",
        language: "zh-id",
        ownerId: "teacher-lina",
        status: "published",
        currentVersion: 1,
        downloadCount: 1,
        createdAt: iso(addDays(now, -2)),
        versions: [
          {
            version: 1,
            fileName: "time-review-audio.wav",
            sizeLabel: "303 KB",
            url: "/shared/demo-materials/time-review-audio.wav",
            publishedAt: iso(addDays(now, -2))
          }
        ]
      },
      {
        id: "material-video-link",
        title: "情境视频：初次见面",
        description: "一段短视频外链，用于课后复习语境。",
        kind: "link",
        fileType: "video",
        language: "zh-id",
        ownerId: "teacher-lina",
        status: "published",
        currentVersion: 1,
        downloadCount: 3,
        createdAt: iso(addDays(now, -3)),
        externalUrl: "https://www.youtube.com/results?search_query=mandarin+greetings+for+beginners",
        versions: []
      }
    ];

    const materialRefs = [
      { id: "ref-preview-pdf", materialId: "material-preview-pdf", lessonId: "lesson-greetings", phase: "preview", order: 1, published: true },
      { id: "ref-friends-preview", materialId: "material-friends-preview", lessonId: "lesson-friends", phase: "preview", order: 1, published: true },
      { id: "ref-time-courseware", materialId: "material-time-courseware", lessonId: "lesson-time", phase: "preview", order: 1, published: true },
      { id: "ref-time-review-sheet", materialId: "material-time-review-sheet", lessonId: "lesson-time", phase: "review", order: 1, published: true },
      { id: "ref-time-review-audio", materialId: "material-time-review-audio", lessonId: "lesson-time", phase: "review", order: 2, published: true },
      { id: "ref-live-slides", materialId: "material-live-slides", lessonId: "lesson-greetings", phase: "live", order: 1, published: true },
      { id: "ref-review-audio", materialId: "material-review-audio", lessonId: "lesson-greetings", phase: "review", order: 1, published: true },
      { id: "ref-review-video", materialId: "material-video-link", lessonId: "lesson-greetings", phase: "review", order: 2, published: true }
    ];

    const notifications = [
      {
        id: "notice-anisa-live",
        userId: "student-anisa",
        type: "class_reminder",
        title: "课堂马上开始",
        body: "问候口语大班课已经开放，请进入课堂完成互动。",
        read: false,
        createdAt: iso(new Date(liveStart.getTime() - 30 * 60 * 1000)),
        link: "/student/schedule"
      },
      {
        id: "notice-anisa-preview",
        userId: "student-anisa",
        type: "content_published",
        title: "新的预习任务",
        body: "Lina 老师更新了“问候热身”，可以在上课前完成。",
        read: false,
        createdAt: iso(addDays(now, -4)),
        link: "/student/lesson/lesson-greetings?phase=preview&sessionId=session-live"
      },
      {
        id: "notice-teacher-roster",
        userId: "teacher-lina",
        type: "roster_update",
        title: "预约名单有更新",
        body: "Raymond 预约了今晚的问候口语大班课。",
        read: false,
        createdAt: iso(addDays(now, -2)),
        link: "/teacher/session/session-live"
      },
      {
        id: "notice-ops-waitlist",
        userId: "operator-ray",
        type: "waitlist",
        title: "候补队列需要关注",
        body: "“时间表达 · 满员演练课”已有 1 位候补学生。",
        read: false,
        createdAt: iso(addDays(now, -1)),
        link: "/operator/sessions/session-waitlist-full"
      }
    ];

    const changeRequests = [
      {
        id: "request-reschedule-1",
        sessionId: "series-session-2",
        teacherId: "teacher-lina",
        kind: "reschedule",
        reason: "9月26日学校有中文教研活动，希望这节课顺延一天到同一时间段。",
        status: "pending",
        createdAt: iso(addDays(now, -1))
      }
    ];

    const auditEvents = [
      {
        id: "audit-1",
        actorId: "operator-ray",
        action: "create_session",
        targetType: "session",
        targetId: "session-preview",
        summary: "创建“认识新朋友 · 周末体验课”",
        reason: "",
        createdAt: iso(addDays(now, -5))
      },
      {
        id: "audit-2",
        actorId: "teacher-lina",
        action: "publish_interaction",
        targetType: "interaction_set",
        targetId: "set-greetings-preview",
        summary: "发布“问候热身”第 2 版",
        reason: "补充印尼语解释",
        createdAt: iso(addDays(now, -4))
      },
      {
        id: "audit-3",
        actorId: "operator-ray",
        action: "proxy_booking",
        targetType: "session",
        targetId: "session-live",
        summary: "为 Raymond 代约问候口语大班课",
        reason: "学生家长通过客服渠道提出预约",
        createdAt: iso(addDays(now, -2))
      }
    ];

    return {
      version: 2,
      generatedAt: iso(now),
      currentUserId: "student-anisa",
      ui: {
        language: "zh-CN",
        timeZone: "Asia/Jakarta",
        sidebarCollapsed: false
      },
      users,
      students,
      folders,
      lessons,
      series,
      sessions,
      bookings,
      waitlist,
      interactionSets,
      interactionVersions,
      interactionTemplates,
      interactionAttempts,
      materials,
      materialRefs,
      notifications,
      changeRequests,
      auditEvents
    };
  }

  const api = { createSeedData };
  global.AICloudSeedData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
