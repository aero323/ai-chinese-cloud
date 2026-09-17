# AI Chinese Cloud 三角色课堂管理与学习原型

同一个工程内包含两套可联动的原型：

- `/`：面向学生的移动学习端，保留原有的课堂互动、预习与完成流程。
- `/admin/`：学生、教师、运营三角色共用的课堂管理后台。

## 运行

```bash
npm install
npm run dev
```

打开：

- 学习端：`http://127.0.0.1:5173/`
- 管理后台：`http://127.0.0.1:5173/admin/`

生产构建与测试：

```bash
npm test
npm run build
npm run preview
```

## 后台能力

### 学生端

- 按单次课堂或系列班预约课程，查看余位、候补和自动转正结果。
- 按用户时区查看课程时间，取消预约或退出候补。
- 查看并下载课前、课中、课后材料。
- 完成连线、翻牌、选择、排序、填空和投票六类互动。
- 查看得分、用时、尝试次数和错题复习建议。

### 教师端

- 查看本人课表、预约名单和班级互动结果。
- 使用六类模板设计互动，支持预览、发布、版本历史和回滚。
- 管理课程材料、模拟上传新版本并关联到具体课节阶段。
- 教师端名单只读，不展示学生联系方式。

### 运营端

- 管理不限层级的自由课程目录、课节、单次班次与系列班。
- 配置教师、容量、预约截止和取消截止时间，自动检测教师冲突。
- 管理学生档案、学习偏好和进度。
- 代学生预约、候补、改约和取消；强制操作需要填写原因并写入审计日志。
- 查看和回滚教师发布的互动，下架或恢复课程材料。

## 演示数据与状态

- 演示账号：`Anisa`（学生）、`Lina 老师`（教师）、`Ray 运营`。
- 后台顶栏可以快速切换角色、界面语言和时区。
- 状态保存在浏览器 `localStorage`，键名为 `ai-chinese-cloud-platform-v2`。
- 学习端和后台在同一域名下共享状态，后台发布或修改后会反映到学习入口。
- “重置演示数据”可以恢复全部初始数据。
- 新上传文件在原型中只保存元数据；`public/shared/demo-materials/` 中的 PDF、PPTX 和音频可以真实下载。

## 技术说明

- Vite + React + TypeScript + React Router + Zustand。
- i18next 提供简体中文和印尼语切换。
- `date-fns`、`Intl.DateTimeFormat` 和 UTC 存储共同处理跨时区时间。
- `@dnd-kit` 用于排序互动。
- Vitest 覆盖预约、候补、系列班、冲突、互动版本、学生与课程创建、评分及时区逻辑。
## 学生端题型扩展（第一批）

学生端手机原型里已经跑通 2 种题型：连线配对（match.html）、翻牌记忆（memory.html）。其余 4 种按下面的约定认领实现，一人一个页面：单选/多选、排序、填空、投票。

### 课堂上呈现什么由老师端决定

课堂页（classroom.html）展示的两道题是“本课已布置的互动”，学生端不做随机抽题；老师端发布后，学生端收到的就是老师布置的内容。

### 题型体验按钮

学生端每个页面右下角有一个悬浮按钮「题型体验」（在原有“演示”按钮上方）。点开是一张题型清单，列出全部题型，点任意一行直接进入该题型单题体验。体验不计分，也不影响课堂页那两道题的进度；做完可以再点按钮换别的题型。清单里灰底、标着“待认领”的题型表示页面还没做完。

也可以直接用网址展开清单：在任意页面地址后面加 `?activities=1`（例如 `classroom.html?activities=1`），打开页面就会自动弹出题型清单。题型页面完成弹窗里的「换一个题型」指向这里。

### 一期四个题型（已完成）

| 题型 | 页面文件 | 当前状态 |
| --- | --- | --- |
| 单选 / 多选 | interaction-choice.html | 已完成，可体验 |
| 排序 | interaction-order.html | 已完成，可体验（点选词块组句） |
| 填空 | interaction-fill.html | 已完成，可体验 |
| 投票 | interaction-poll.html | 已完成，可体验 |

### 二期四个题型（已完成）

| 题型 | 页面文件 | 当前状态 |
| --- | --- | --- |
| 看图单选 | interaction-picture.html | 已完成，可体验 |
| 图片—词语连线 | interaction-picture-match.html | 已完成，可体验（点选配对，不画线） |
| 情景选择 | interaction-situation.html | 已完成，可体验 |
| 对话补全 | interaction-dialogue.html | 已完成，可体验 |

### 每个页面的硬约定

1. 文件名不要改，入口固定是 interaction-xxx.html。
2. 外壳复用现有样式类：app-shell、status-bar、page-header、game-intro、progress-pill、helper-note、modal-overlay、completion-modal、primary-button。
3. 只新增自己的样式文件 interaction-xxx.css，不要修改 styles.css，多人并行会冲突。
4. 完成时调用公共脚本：

       AICloudActivity.finish({ correct: true, seconds: 12 });

   体验模式（网址里只有 type 参数）：不记账，页面自己弹完成弹窗。
   课堂模式（网址带 mode=class 和 slot）：写入进度，第 1 题回课堂页，第 2 题进完成页。
   体验模式弹窗里的「换一个题型」指向 `classroom.html?activities=1`，「返回课堂」指向 `classroom.html`。
5. 页面里可以随时用 AICloudActivity.context() 拿到当前是第几题、哪种题型。
6. 做完之后，把 shared/activity-types.js 里自己那条的 ready 改成 true，题型清单里就会变成“可体验”。

逐题型的详细任务书见 docs/ 目录。
