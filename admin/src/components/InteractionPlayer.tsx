import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InteractionItem } from "../domain/types";
import { Badge, Button, ProgressBar } from "./ui";

export interface PlayerResult {
  score: number;
  answers: Record<string, unknown>;
  wrongItemIds: string[];
  pollAnswers: Record<string, string>;
  elapsedSeconds: number;
}

interface InteractionPlayerProps {
  items: InteractionItem[];
  onComplete?: (result: PlayerResult) => void;
  onClose?: () => void;
  preview?: boolean;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export function InteractionPlayer({ items, onComplete, onClose, preview = false }: InteractionPlayerProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [results, setResults] = useState<Record<string, boolean | null>>({});
  const [pollAnswers, setPollAnswers] = useState<Record<string, string>>({});
  const [startedAt] = useState(() => Date.now());
  const current = items[index];

  function resolveItem(itemId: string, correct: boolean, answer: unknown) {
    setResults((previous) => ({ ...previous, [itemId]: correct }));
    setAnswers((previous) => ({ ...previous, [itemId]: answer }));
  }

  function next() {
    if (index < items.length - 1) {
      setIndex((value) => value + 1);
      return;
    }
    const scored = items.filter((item) => item.type !== "poll");
    const correctCount = scored.filter((item) => results[item.id] === true).length;
    const score = scored.length ? Math.round((correctCount / scored.length) * 100) : 100;
    const wrongItemIds = scored.filter((item) => results[item.id] !== true).map((item) => item.id);
    onComplete?.({
      score,
      answers,
      wrongItemIds,
      pollAnswers,
      elapsedSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    });
  }

  if (!current) {
    return (
      <div className="player-empty">
        <strong>暂无互动内容</strong>
        <span>教师在编辑器中添加题目后会显示在这里。</span>
      </div>
    );
  }

  const isResolved = current.type === "poll" ? Boolean(pollAnswers[current.id]) : results[current.id] !== undefined && results[current.id] !== null;
  const isCorrect = results[current.id] === true;

  return (
    <section className="interaction-player">
      <header className="player-header">
        <div>
          <span className="eyebrow">
            互动 {index + 1} / {items.length}
          </span>
          <h2>{current.prompt}</h2>
        </div>
        <Badge tone={current.type === "poll" ? "blue" : "purple"}>
          {current.type === "match" && "连线"}
          {current.type === "memory" && "翻牌"}
          {current.type === "choice" && "选择"}
          {current.type === "order" && "排序"}
          {current.type === "fill" && "填空"}
          {current.type === "poll" && "投票"}
        </Badge>
      </header>

      <ProgressBar value={((index + (isResolved ? 1 : 0)) / Math.max(1, items.length)) * 100} />

      <div className="player-stage">
        {current.type === "match" && (
          <MatchStage
            item={current}
            disabled={isResolved}
            onResolved={(correct) => resolveItem(current.id, correct, current.pairs)}
          />
        )}
        {current.type === "memory" && (
          <MemoryStage
            item={current}
            disabled={isResolved}
            onResolved={(correct) => resolveItem(current.id, correct, current.pairs)}
          />
        )}
        {current.type === "choice" && (
          <ChoiceStage
            item={current}
            disabled={isResolved}
            onResolved={(correct, selected) => resolveItem(current.id, correct, selected)}
          />
        )}
        {current.type === "order" && (
          <OrderStage
            item={current}
            disabled={isResolved}
            onResolved={(correct, order) => resolveItem(current.id, correct, order)}
          />
        )}
        {current.type === "fill" && (
          <FillStage
            item={current}
            disabled={isResolved}
            onResolved={(correct, values) => resolveItem(current.id, correct, values)}
          />
        )}
        {current.type === "poll" && (
          <PollStage
            item={current}
            disabled={isResolved}
            selected={pollAnswers[current.id]}
            onSelect={(optionId) => {
              setPollAnswers((previous) => ({ ...previous, [current.id]: optionId }));
              setResults((previous) => ({ ...previous, [current.id]: true }));
              setAnswers((previous) => ({ ...previous, [current.id]: optionId }));
            }}
          />
        )}
      </div>

      {isResolved && (
        <div className={`answer-feedback ${isCorrect || current.type === "poll" ? "correct" : "incorrect"}`}>
          {isCorrect || current.type === "poll" ? <Check size={18} /> : <X size={18} />}
          <div>
            <strong>{current.type === "poll" ? t("student.pollThanks") : isCorrect ? t("student.correct") : t("student.incorrect")}</strong>
            <p>{current.explanation}</p>
          </div>
        </div>
      )}

      <footer className="player-footer">
        <Button variant="ghost" onClick={onClose}>
          {t("common.close")}
        </Button>
        <div className="player-actions">
          {preview && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setResults({});
                setAnswers({});
                setPollAnswers({});
                setIndex(0);
              }}
            >
              <RotateCcw size={16} /> 重置预览
            </Button>
          )}
          <Button onClick={next} disabled={!isResolved}>
            {index === items.length - 1 ? t("student.finish") : t("student.nextItem")}
          </Button>
        </div>
      </footer>
    </section>
  );
}

function MatchStage({
  item,
  disabled,
  onResolved
}: {
  item: InteractionItem;
  disabled: boolean;
  onResolved: (correct: boolean) => void;
}) {
  const [rightItems] = useState(() => shuffle(item.pairs ?? []));
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);

  function chooseRight(rightId: string) {
    if (disabled || !selectedLeft) return;
    if (selectedLeft === rightId) {
      const nextMatched = [...matched, selectedLeft];
      setMatched(nextMatched);
      setSelectedLeft(null);
      if (nextMatched.length === (item.pairs?.length ?? 0)) onResolved(true);
      return;
    }
    setWrong([selectedLeft, rightId]);
    window.setTimeout(() => {
      setWrong([]);
      setSelectedLeft(null);
    }, 650);
  }

  return (
    <div className="match-player-grid">
      <div className="match-player-column">
        {(item.pairs ?? []).map((pair) => (
          <button
            key={pair.id}
            className={`match-tile ${selectedLeft === pair.id ? "selected" : ""} ${matched.includes(pair.id) ? "matched" : ""} ${wrong.includes(pair.id) ? "wrong" : ""}`}
            disabled={disabled || matched.includes(pair.id)}
            onClick={() => setSelectedLeft(pair.id)}
          >
            <strong>{pair.left}</strong>
          </button>
        ))}
      </div>
      <div className="match-player-column">
        {rightItems.map((pair) => (
          <button
            key={`right-${pair.id}`}
            className={`match-tile ${matched.includes(pair.id) ? "matched" : ""} ${wrong.includes(pair.id) ? "wrong" : ""}`}
            disabled={disabled || matched.includes(pair.id)}
            onClick={() => chooseRight(pair.id)}
          >
            <strong>{pair.right}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function MemoryStage({
  item,
  disabled,
  onResolved
}: {
  item: InteractionItem;
  disabled: boolean;
  onResolved: (correct: boolean) => void;
}) {
  const cards = useMemo(
    () =>
      shuffle(
        (item.pairs ?? []).flatMap((pair) => [
          { id: `${pair.id}-left`, pairId: pair.id, text: pair.left },
          { id: `${pair.id}-right`, pairId: pair.id, text: pair.right }
        ])
      ),
    [item.pairs]
  );
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const resolving = useRef(false);

  function flip(card: (typeof cards)[number]) {
    if (disabled || resolving.current || flipped.includes(card.id) || matched.includes(card.pairId)) return;
    if (flipped.length === 0) {
      setFlipped([card.id]);
      return;
    }
    const firstId = flipped[0];
    const first = cards.find((candidate) => candidate.id === firstId);
    if (!first) return;
    setFlipped([firstId, card.id]);
    if (first.pairId === card.pairId) {
      const nextMatched = [...matched, card.pairId];
      setMatched(nextMatched);
      setFlipped([]);
      if (nextMatched.length === (item.pairs?.length ?? 0)) onResolved(true);
      return;
    }
    resolving.current = true;
    window.setTimeout(() => {
      setFlipped([]);
      resolving.current = false;
    }, 750);
  }

  return (
    <div className="memory-player-grid">
      {cards.map((card) => {
        const isOpen = flipped.includes(card.id) || matched.includes(card.pairId);
        return (
          <button key={card.id} className={`memory-player-card ${isOpen ? "open" : ""} ${matched.includes(card.pairId) ? "matched" : ""}`} onClick={() => flip(card)}>
            <span>{isOpen ? card.text : "?"}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChoiceStage({
  item,
  disabled,
  onResolved
}: {
  item: InteractionItem;
  disabled: boolean;
  onResolved: (correct: boolean, selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  function toggle(choiceId: string) {
    if (disabled) return;
    if (item.multiple) {
      setSelected((current) => (current.includes(choiceId) ? current.filter((id) => id !== choiceId) : [...current, choiceId]));
    } else {
      setSelected([choiceId]);
    }
  }
  const correct = (item.choices ?? []).filter((choice) => choice.isCorrect).map((choice) => choice.id).sort();
  return (
    <div className="choice-player-list">
      {(item.choices ?? []).map((choice, choiceIndex) => (
        <button key={choice.id} className={`choice-player-item ${selected.includes(choice.id) ? "selected" : ""}`} onClick={() => toggle(choice.id)} disabled={disabled}>
          <span>{LETTERS[choiceIndex]}</span>
          <strong>{choice.text}</strong>
        </button>
      ))}
      <Button
        className="stage-submit"
        disabled={disabled || selected.length === 0}
        onClick={() => onResolved(JSON.stringify([...selected].sort()) === JSON.stringify(correct), selected)}
      >
        提交本题
      </Button>
    </div>
  );
}

function SortableOrderItem({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`sortable-item ${isDragging ? "dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <GripVertical size={18} />
      <strong>{text}</strong>
    </div>
  );
}

function OrderStage({
  item,
  disabled,
  onResolved
}: {
  item: InteractionItem;
  disabled: boolean;
  onResolved: (correct: boolean, order: string[]) => void;
}) {
  const [order, setOrder] = useState(() => shuffle(item.orderItems ?? []));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((items) => {
      const oldIndex = items.findIndex((entry) => entry.id === active.id);
      const newIndex = items.findIndex((entry) => entry.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }
  const ids = order.map((entry) => entry.id);
  const correct = JSON.stringify(ids) === JSON.stringify(item.correctOrder);
  return (
    <div className="order-player">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="sortable-list">
            {order.map((entry) => (
              <SortableOrderItem key={entry.id} id={entry.id} text={entry.text} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button className="stage-submit" disabled={disabled} onClick={() => onResolved(correct, ids)}>
        提交本题
      </Button>
    </div>
  );
}

function FillStage({
  item,
  disabled,
  onResolved
}: {
  item: InteractionItem;
  disabled: boolean;
  onResolved: (correct: boolean, values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const blanks = item.blanks ?? [];
  const allCorrect = blanks.every((blank) => {
    const value = (values[blank.id] ?? "").trim().toLowerCase();
    return blank.answers.some((answer) => answer.trim().toLowerCase() === value);
  });
  const parts = (item.sentence ?? item.prompt).split("____");
  return (
    <div className="fill-player">
      <div className="fill-sentence">
        {parts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < blanks.length && (
              <input
                className="fill-input"
                value={values[blanks[index].id] ?? ""}
                onChange={(event) => setValues((previous) => ({ ...previous, [blanks[index].id]: event.target.value }))}
                disabled={disabled}
                aria-label={`空 ${index + 1}`}
              />
            )}
          </span>
        ))}
      </div>
      <Button className="stage-submit" disabled={disabled || blanks.some((blank) => !values[blank.id]?.trim())} onClick={() => onResolved(allCorrect, values)}>
        提交本题
      </Button>
    </div>
  );
}

function PollStage({
  item,
  disabled,
  selected,
  onSelect
}: {
  item: InteractionItem;
  disabled: boolean;
  selected?: string;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="poll-player">
      {(item.pollOptions ?? []).map((option, optionIndex) => (
        <button key={option.id} className={`poll-option ${selected === option.id ? "selected" : ""}`} onClick={() => onSelect(option.id)} disabled={disabled}>
          <span>{LETTERS[optionIndex]}</span>
          <strong>{option.text}</strong>
          <i>{selected === option.id ? "已选择" : "选择"}</i>
        </button>
      ))}
    </div>
  );
}
