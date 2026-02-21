"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Square, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAbort: () => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, onAbort, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Append transcript to input as user speaks
  const baseInputRef = useRef("");
  useEffect(() => {
    if (isListening && transcript) {
      setInput(baseInputRef.current + transcript);
    }
  }, [transcript, isListening]);

  // When recognition ends, keep the final text and reset transcript
  useEffect(() => {
    if (!isListening && transcript) {
      baseInputRef.current = baseInputRef.current + transcript;
      resetTranscript();
    }
  }, [isListening, transcript, resetTranscript]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
    baseInputRef.current = "";
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    baseInputRef.current = e.target.value;
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      baseInputRef.current = input;
      startListening();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t bg-card p-3">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask about products, orders, inventory..."
        rows={1}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ minHeight: "36px", maxHeight: "120px" }}
        disabled={isLoading}
      />
      {isSupported && (
        <Button
          size="icon"
          variant={isListening ? "destructive" : "ghost"}
          onClick={handleMicClick}
          disabled={isLoading}
          className={`h-9 w-9 shrink-0 ${isListening ? "animate-pulse" : ""}`}
          title={isListening ? "Stop recording" : "Start voice input"}
        >
          {isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}
      {isLoading ? (
        <Button
          size="icon"
          variant="destructive"
          onClick={onAbort}
          className="h-9 w-9 shrink-0"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
