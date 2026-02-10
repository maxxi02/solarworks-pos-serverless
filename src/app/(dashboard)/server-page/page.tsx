// components/forms/chat-form.tsx
"use client"

import { useState } from "react";

interface ChatFormProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;           // ← add this
}

export default function ChatForm({ onSendMessage, disabled = false }: ChatFormProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={disabled ? "Reconnecting..." : "Type a message..."}
        disabled={disabled}
        className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className={`px-6 py-3 rounded-xl font-medium text-white transition-colors ${disabled || !input.trim()
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
      >
        Send
      </button>
    </form>
  );
}