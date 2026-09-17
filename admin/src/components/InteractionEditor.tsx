import { Plus, Trash2 } from "lucide-react";
import type { InteractionChoice, InteractionItem, InteractionPair, InteractionType } from "../domain/types";
import { Button, Field, Select, TextInput } from "./ui";

const typeOptions: Array<{ type: InteractionType; label: string; hint: string }> = [
  { type: "match", label: "连线配对", hint: "左右点击配对，适合词汇和释义。" },
  { type: "memory", label: "翻牌记忆", hint: "翻开两张卡片寻找配对。" },
  { type: "choice", label: "单选 / 多选", hint: "选择一个或多个正确选项。" },
  { type: "order", label: "排序", hint: "拖动词语组成正确句子。" },
  { type: "fill", label: "填空", hint: "在句子中输入缺失词语。" },
  { type: "poll", label: "投票", hint: "收集课堂选择，不计分。" }
];

function editorId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createInteractionItem(type: InteractionType): InteractionItem {
  const base = {
    id: editorId("item"),
    type,
    prompt: type === "match" ? "把中文和印尼语正确配对。" : type === "poll" ? "你今天最喜欢的活动是什么？" : "请完成下面题目。",
    explanation: "这里填写答题后的解释。"
  };
  if (type === "match" || type === "memory") {
    return {
      ...base,
      pairs: [
        { id: editorId("pair"), left: "你好", right: "Halo" },
        { id: editorId("pair"), left: "再见", right: "Sampai jumpa" }
      ]
    };
  }
  if (type === "choice") {
    return {
      ...base,
      multiple: false,
      choices: [
        { id: editorId("choice"), text: "选项 A", isCorrect: true },
        { id: editorId("choice"), text: "选项 B", isCorrect: false },
        { id: editorId("choice"), text: "选项 C", isCorrect: false }
      ]
    };
  }
  if (type === "order") {
    const items = [
      { id: editorId("order"), text: "你好" },
      { id: editorId("order"), text: "我是 Anisa" },
      { id: editorId("order"), text: "很高兴认识你" }
    ];
    return { ...base, orderItems: items, correctOrder: items.map((item) => item.id) };
  }
  if (type === "fill") {
    return {
      ...base,
      prompt: "填写缺失的词语。",
      sentence: "早上见面时说：____ 好！",
      blanks: [{ id: editorId("blank"), answers: ["早上"] }]
    };
  }
  return {
    ...base,
    pollOptions: [
      { id: editorId("poll"), text: "词汇连线" },
      { id: editorId("poll"), text: "翻牌记忆" },
      { id: editorId("poll"), text: "开口表达" }
    ]
  };
}

export function InteractionEditor({
  items,
  onChange
}: {
  items: InteractionItem[];
  onChange: (items: InteractionItem[]) => void;
}) {
  function updateItem(itemId: string, patch: Partial<InteractionItem>) {
    onChange(items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function removeItem(itemId: string) {
    onChange(items.filter((item) => item.id !== itemId));
  }

  return (
    <div className="interaction-editor">
      <div className="editor-toolbar">
        <div>
          <strong>互动题目</strong>
          <span>共 {items.length} 题，拖动功能在学生学习端呈现。</span>
        </div>
        <div className="editor-add-group">
          {typeOptions.map((option) => (
            <Button key={option.type} size="sm" variant="secondary" onClick={() => onChange([...items, createInteractionItem(option.type)])} title={option.hint}>
              <Plus size={15} /> {option.label}
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <div className="editor-empty">
          <strong>还没有互动题目</strong>
          <span>从上方选择一种模板开始配置。</span>
        </div>
      )}

      <div className="editor-item-list">
        {items.map((item, index) => (
          <article className="editor-item-card" key={item.id}>
            <header>
              <span className="editor-index">{index + 1}</span>
              <div>
                <strong>
                  {typeOptions.find((option) => option.type === item.type)?.label}
                </strong>
                <small>{typeOptions.find((option) => option.type === item.type)?.hint}</small>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)} aria-label="删除题目">
                <Trash2 size={17} />
              </Button>
            </header>

            <div className="editor-grid">
              <Field label="题目说明" className="field-span-2">
                <textarea className="input textarea" value={item.prompt} onChange={(event) => updateItem(item.id, { prompt: event.target.value })} />
              </Field>
              <Field label="答题解释" className="field-span-2">
                <textarea className="input textarea" value={item.explanation} onChange={(event) => updateItem(item.id, { explanation: event.target.value })} />
              </Field>
            </div>

            {(item.type === "match" || item.type === "memory") && (
              <PairEditor item={item} onChange={(patch) => updateItem(item.id, patch)} />
            )}
            {item.type === "choice" && <ChoiceEditor item={item} onChange={(patch) => updateItem(item.id, patch)} />}
            {item.type === "order" && <OrderEditor item={item} onChange={(patch) => updateItem(item.id, patch)} />}
            {item.type === "fill" && <FillEditor item={item} onChange={(patch) => updateItem(item.id, patch)} />}
            {item.type === "poll" && <PollEditor item={item} onChange={(patch) => updateItem(item.id, patch)} />}
          </article>
        ))}
      </div>
    </div>
  );
}

function PairEditor({ item, onChange }: { item: InteractionItem; onChange: (patch: Partial<InteractionItem>) => void }) {
  const pairs = item.pairs ?? [];
  function updatePair(pairId: string, patch: Partial<InteractionPair>) {
    onChange({ pairs: pairs.map((pair) => (pair.id === pairId ? { ...pair, ...patch } : pair)) });
  }
  return (
    <div className="editor-subsection">
      <div className="subsection-heading">
        <strong>配对内容</strong>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onChange({ pairs: [...pairs, { id: editorId("pair"), left: "中文", right: "Bahasa Indonesia" }] })}
        >
          <Plus size={14} /> 添加配对
        </Button>
      </div>
      <div className="pair-editor-list">
        {pairs.map((pair, index) => (
          <div className="pair-editor-row" key={pair.id}>
            <span>{index + 1}</span>
            <TextInput value={pair.left} onChange={(event) => updatePair(pair.id, { left: event.target.value })} placeholder="中文" />
            <TextInput value={pair.right} onChange={(event) => updatePair(pair.id, { right: event.target.value })} placeholder="印尼语" />
            <Button size="icon" variant="ghost" onClick={() => onChange({ pairs: pairs.filter((entry) => entry.id !== pair.id) })}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoiceEditor({ item, onChange }: { item: InteractionItem; onChange: (patch: Partial<InteractionItem>) => void }) {
  const choices = item.choices ?? [];
  function updateChoice(choiceId: string, patch: Partial<InteractionChoice>) {
    let next = choices.map((choice) => (choice.id === choiceId ? { ...choice, ...patch } : choice));
    if (!item.multiple && patch.isCorrect) {
      next = next.map((choice) => ({ ...choice, isCorrect: choice.id === choiceId }));
    }
    onChange({ choices: next });
  }
  return (
    <div className="editor-subsection">
      <div className="subsection-heading">
        <label className="inline-check">
          <input type="checkbox" checked={Boolean(item.multiple)} onChange={(event) => onChange({ multiple: event.target.checked })} />
          允许多选
        </label>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onChange({ choices: [...choices, { id: editorId("choice"), text: "新选项", isCorrect: false }] })}
        >
          <Plus size={14} /> 添加选项
        </Button>
      </div>
      <div className="choice-editor-list">
        {choices.map((choice, index) => (
          <div className="choice-editor-row" key={choice.id}>
            <button className={choice.isCorrect ? "answer-toggle active" : "answer-toggle"} onClick={() => updateChoice(choice.id, { isCorrect: !choice.isCorrect })}>
              {choice.isCorrect ? "✓" : String.fromCharCode(65 + index)}
            </button>
            <TextInput value={choice.text} onChange={(event) => updateChoice(choice.id, { text: event.target.value })} />
            <Button size="icon" variant="ghost" onClick={() => onChange({ choices: choices.filter((entry) => entry.id !== choice.id) })}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
      <small className="editor-help">点击左侧字母按钮，将选项标记为正确答案。</small>
    </div>
  );
}

function OrderEditor({ item, onChange }: { item: InteractionItem; onChange: (patch: Partial<InteractionItem>) => void }) {
  const orderItems = item.orderItems ?? [];
  return (
    <div className="editor-subsection">
      <div className="subsection-heading">
        <strong>正确顺序</strong>
        <Button size="sm" variant="secondary" onClick={() => {
          const next = [...orderItems, { id: editorId("order"), text: "新词语" }];
          onChange({ orderItems: next, correctOrder: next.map((entry) => entry.id) });
        }}>
          <Plus size={14} /> 添加词语
        </Button>
      </div>
      <div className="order-editor-list">
        {orderItems.map((entry, index) => (
          <div key={entry.id} className="order-editor-row">
            <span>{index + 1}</span>
            <TextInput
              value={entry.text}
              onChange={(event) => {
                const next = orderItems.map((candidate) => (candidate.id === entry.id ? { ...candidate, text: event.target.value } : candidate));
                onChange({ orderItems: next, correctOrder: next.map((candidate) => candidate.id) });
              }}
            />
            <Button size="icon" variant="ghost" onClick={() => {
              const next = orderItems.filter((candidate) => candidate.id !== entry.id);
              onChange({ orderItems: next, correctOrder: next.map((candidate) => candidate.id) });
            }}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FillEditor({ item, onChange }: { item: InteractionItem; onChange: (patch: Partial<InteractionItem>) => void }) {
  const blanks = item.blanks ?? [];
  return (
    <div className="editor-subsection">
      <div className="subsection-heading">
        <strong>填空答案</strong>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const next = [...blanks, { id: editorId("blank"), answers: ["答案"] }];
            onChange({ blanks: next, sentence: `${item.sentence ?? ""}____`.trim() });
          }}
        >
          <Plus size={14} /> 添加空格
        </Button>
      </div>
      <Field label="带空格的句子" hint="每个 ____ 对应下面的一个空格答案。">
        <TextInput value={item.sentence ?? ""} onChange={(event) => onChange({ sentence: event.target.value })} />
      </Field>
      <div className="blank-editor-list">
        {blanks.map((blank, index) => (
          <div className="blank-editor-row" key={blank.id}>
            <span>空 {index + 1}</span>
            <TextInput
              value={blank.answers.join(" / ")}
              onChange={(event) => onChange({ blanks: blanks.map((entry) => (entry.id === blank.id ? { ...entry, answers: event.target.value.split("/").map((value) => value.trim()).filter(Boolean) } : entry)) })}
              placeholder="多个答案用 / 分隔"
            />
            <Button size="icon" variant="ghost" onClick={() => onChange({ blanks: blanks.filter((entry) => entry.id !== blank.id) })}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PollEditor({ item, onChange }: { item: InteractionItem; onChange: (patch: Partial<InteractionItem>) => void }) {
  const options = item.pollOptions ?? [];
  return (
    <div className="editor-subsection">
      <div className="subsection-heading">
        <strong>投票选项</strong>
        <Button size="sm" variant="secondary" onClick={() => onChange({ pollOptions: [...options, { id: editorId("poll"), text: "新选项" }] })}>
          <Plus size={14} /> 添加选项
        </Button>
      </div>
      <div className="choice-editor-list">
        {options.map((option, index) => (
          <div className="choice-editor-row" key={option.id}>
            <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
            <TextInput value={option.text} onChange={(event) => onChange({ pollOptions: options.map((entry) => (entry.id === option.id ? { ...entry, text: event.target.value } : entry)) })} />
            <Button size="icon" variant="ghost" onClick={() => onChange({ pollOptions: options.filter((entry) => entry.id !== option.id) })}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
