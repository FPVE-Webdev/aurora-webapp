'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hei! 👋 Jeg er din nordlys-guide. Lurer du på noe om nordlyset i kveld?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate bot response
    setTimeout(() => {
      const botResponses = [
        "Det ser bra ut for nordlys i kveld! KP-indeksen er lovende.",
        "Husk å kle deg godt, det er kaldt ute!",
        "Prøv å finne et sted med lite lysforurensning for best sikt.",
        "Jeg kan dessverre ikke se live-kameraer ennå, men prognosen er god.",
        "Skal jeg sjekke skydekket for deg?",
      ];
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      <div 
        className={cn(
          "mb-4 w-[350px] max-w-[calc(100vw-48px)] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right pointer-events-auto",
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none h-0 opacity-0"
        )}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-primary/20 to-purple-500/20 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm">Nordlys Guide</h3>
              <p className="text-white/50 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Online
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white/50 hover:text-white transition-colors p-1"
            title="Lukk chat"
            aria-label="Lukk chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-black/20 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full mb-2",
                msg.sender === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.sender === 'user' 
                    ? "bg-primary text-white rounded-br-sm" 
                    : "bg-white/10 text-white/90 rounded-bl-sm backdrop-blur-sm"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/5">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Skriv en melding..."
              className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-2.5 pr-12 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-light"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-1.5 p-1.5 bg-primary rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
              title="Send melding"
              aria-label="Send melding"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* FAB Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-purple-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300 pointer-events-auto",
          isOpen && "rotate-90 scale-0 opacity-0"
        )}
        title="Åpne chat"
        aria-label="Åpne chat"
      >
        <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <MessageCircle className="w-7 h-7" />
      </button>

      {/* Close FAB (visible when open) */}
       <button
        onClick={() => setIsOpen(false)}
        className={cn(
          "absolute bottom-0 right-0 flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 hover:scale-105 transition-all duration-300 pointer-events-auto",
          !isOpen && "scale-0 opacity-0 rotate-90"
        )}
        title="Lukk chat"
        aria-label="Lukk chat"
      >
        <X className="w-7 h-7" />
      </button>
    </div>
  );
}
