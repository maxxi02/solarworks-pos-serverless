"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";

const ChatForm = ({
  onSendMessage,
}: {
  onSendMessage: (message: string) => void;
}) => {
  const [message, setMessage] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() !== "") {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        type="text"
        placeholder="Please type your message here"
        className="flex-1 px-4 border-2 rounded-lg focus:outline-none"
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button type="submit">Send</Button>
    </form>
  );
};

export default ChatForm;
