"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AdvisorMessage = {
  role: "user" | "assistant";
  content: string;
};

type AdvisorPanelProps = {
  householdId: string;
  householdName: string;
  isOpen?: boolean;
  onOpenChange?: (next: boolean) => void;
};

const DISCLOSURE_KEY = "rail_advisor_disclosure_seen";

export function AdvisorPanel({ householdId, householdName, isOpen, onOpenChange }: AdvisorPanelProps) {
  const isPanelOpen = Boolean(isOpen);
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isPanelOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) return;
    const seen = window.localStorage.getItem(DISCLOSURE_KEY) === "true";
    setShowDisclosure(!seen);
  }, [isPanelOpen]);

  const canSubmit = useMemo(() => inputValue.trim().length > 0 && !isLoading, [inputValue, isLoading]);

  async function readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = await response.json();
      const error = typeof payload?.error === "string" ? payload.error : "I could not load a response right now.";
      const details = typeof payload?.details === "string" ? payload.details : "";
      return details ? `${error} (${details})` : error;
    } catch {
      return "I could not load a response right now. Please try again.";
    }
  }

  async function handleSend() {
    if (!canSubmit) return;

    const nextUserMessage: AdvisorMessage = { role: "user", content: inputValue.trim() };
    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInputValue("");
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          messages: nextMessages,
        }),
      });

      if (!response.ok || !response.body) {
        const message = await readErrorMessage(response);
        throw new Error(message);
      }
      const modelFromHeader = response.headers.get("x-rail-advisor-model");
      if (modelFromHeader) {
        setActiveModel(modelFromHeader);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: fullText };
          }
          return copy;
        });
      }
    } catch (error: unknown) {
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : "I could not load a response right now. Please try again.";
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && !last.content) {
          copy[copy.length - 1] = {
            role: "assistant",
            content: fallbackMessage,
          };
        }
        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  }

  function dismissDisclosure() {
    window.localStorage.setItem(DISCLOSURE_KEY, "true");
    setShowDisclosure(false);
  }

  function onTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-96 transform border-l border-zinc-200 bg-white shadow-xl transition-transform duration-200 ${
        isPanelOpen ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!isPanelOpen}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <div>
            <p className="type-section-title text-zinc-900">Rail Advisor</p>
            <p className="type-caption text-zinc-600">{householdName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange?.(false)}
            aria-label="Close advisor panel"
          >
            <X className="size-4" />
          </Button>
        </div>

        {showDisclosure ? (
          <div className="m-3 rounded-md border border-amber-200 bg-amber-50 p-3 type-caption text-amber-900">
            <p>
              Rail Advisor provides financial information to help you understand your plan. It does not provide
              regulated financial advice.
            </p>
            <Button variant="outline" size="xs" className="mt-2" onClick={dismissDisclosure}>
              Dismiss
            </Button>
          </div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 type-body text-zinc-600">
              Ask about your latest RAE output and what each part means in plain English.
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex"}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 type-body ${
                  message.role === "user" ? "bg-blue-600 text-white" : "bg-muted text-zinc-900"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isLoading ? (
            <div className="flex">
              <div className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-2">
                <span className="size-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-zinc-200 p-3">
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={onTextareaKeyDown}
              placeholder="Ask Rail Advisor..."
              rows={3}
            />
            <Button onClick={handleSend} disabled={!canSubmit} className="self-end">
              Send
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            Information only - not regulated financial advice.
          </p>
          <p className="mt-1 text-center text-[11px] text-zinc-500">
            Model in use: {activeModel ?? "Awaiting response"}
          </p>
        </div>
      </div>
    </div>
  );
}
