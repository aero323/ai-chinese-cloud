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
      interactionAttempts,
      materials,
      materialRefs,
      notifications,
      auditEvents
    };
  }

  const api = { createSeedData };
  global.AICloudSeedData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
