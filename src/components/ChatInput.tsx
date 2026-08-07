import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSend, disabled, onStop }: ChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex-1 pt-2">
      <div className="glass-card gradient-border flex items-end gap-2 p-2.5 focus-within:border-sky-500/30 transition-colors">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
          }}
          onKeyDown={handleKey}
          placeholder="Ask your database anything... (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none scrollbar-thin max-h-[200px]"
          aria-label="Question input"
        />
        {disabled && onStop ? (
          <button
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors"
            aria-label="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim() || disabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:from-sky-400 hover:to-violet-500 transition-all"
            aria-label="Send question"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-600">
        QueryMind generates read-only PostgreSQL queries. Your data is never modified.
      </p>
    </div>
  );
}
