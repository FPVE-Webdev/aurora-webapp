'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useMasterStatus } from '@/contexts/MasterStatusContext';
import { usePremium } from '@/contexts/PremiumContext';
import { cn } from '@/lib/utils';
import type { StripeProductKey } from '@/lib/stripe';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function ChatWidget() {
  const { status, result, isLoading: statusLoading } = useMasterStatus();
  const { isPremium, subscriptionTier } = usePremium();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [hasIntro, setHasIntro] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const auraVideoRef = useRef<HTMLVideoElement>(null);
  const auraTriggerRef = useRef<HTMLButtonElement>(null);
  const [showAuraVideo, setShowAuraVideo] = useState(false);
  const [videoEligible, setVideoEligible] = useState(false);

  const statusLabel = useMemo(() => {
    if (!result) return 'Laster status...';
    if (result.status === 'GO') return 'GO NOW';
    if (result.status === 'WAIT') return 'WAIT';
    return 'NO (vent)';
  }, [result]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!auraTriggerRef.current) return;
    const el = auraTriggerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) setVideoEligible(true);
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const playAuraVideo = () => {
    if (!videoEligible) return;
    const video = auraVideoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setShowAuraVideo(true);
    video.play().catch(() => setShowAuraVideo(false));
  };

  const stopAuraVideo = () => {
    const video = auraVideoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setShowAuraVideo(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onLocationSelected = (event: Event) => {
      const custom = event as CustomEvent<{
        name: string;
        probability: number;
        kp?: number;
        cloudCoverage?: number;
        temperature?: number;
        windSpeed?: number;
        bestAlternative?: { name: string; probability: number } | null;
      }>;
      const detail = custom.detail;
      if (!detail) return;

      setIsOpen(true);
      const summaryParts = [
        detail.probability != null ? `Nordlyssjanse: ${Math.round(detail.probability)}%` : null,
        detail.kp != null ? `KP: ${detail.kp.toFixed(1)}` : null,
        detail.cloudCoverage != null ? `Skydekke: ${Math.round(detail.cloudCoverage)}%` : null,
        detail.temperature != null ? `Temperatur: ${Math.round(detail.temperature)}°C` : null,
        detail.windSpeed != null ? `Vind: ${Math.round(detail.windSpeed)} m/s` : null,
      ].filter(Boolean);

      const summary = summaryParts.join(' · ');

      const isPro24h = subscriptionTier === 'premium_24h' || subscriptionTier === 'premium_7d' || subscriptionTier === 'enterprise';

      let text: string;
      if (subscriptionTier === 'free') {
        text = `Status Tromsø (generelt): ${summary || 'oppdaterte tall ikke tilgjengelig'}.
Vil du ha rutevalg og beste spot akkurat nå? Oppgrader for detaljer.`;
      } else if (isPro24h) {
        const better =
          detail.bestAlternative &&
          detail.bestAlternative.probability > (detail.probability ?? 0) + 5;
        if (better && detail.bestAlternative) {
          text = `For ${detail.name} ser det moderat ut (${summary}). 
Vurder ${detail.bestAlternative.name} – sjansen er ca ${Math.round(detail.bestAlternative.probability)}% der. Skal jeg hjelpe deg med neste steg?`;
        } else {
          text = `Her er oppdatert status for ${detail.name}: ${summary || 'ingen ferske tall'}. Gi beskjed hvis du vil ha råd om hvor du bør dra.`;
        }
      } else {
        text = `Her er fersk info for ${detail.name}: ${summary}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `spot-${Date.now()}`,
          text,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    };

    window.addEventListener('aura-location-selected', onLocationSelected as EventListener);
    return () => {
      window.removeEventListener('aura-location-selected', onLocationSelected as EventListener);
    };
  }, []);

  // Inject a status-based intro once the Master Status is ready
  useEffect(() => {
    if (hasIntro || statusLoading || !result) return;

    const baseIntro =
      result.status === 'GO'
        ? 'YES! Put on your jacket. Tromsø looks promising right now.'
        : result.status === 'WAIT'
        ? 'Not quite yet. Activity is building, but clouds might interfere.'
        : 'Right now it\'s too bright or too cloudy.';

    const introText = isPremium
      ? `${baseIntro} Ask me where to go or if it's worth waiting.`
      : `${baseIntro} I can give you general directions. 🔒 Unlock for GPS coordinates and exact routes.`;

    setMessages([
      {
        id: 'intro',
        text: introText,
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
    setHasIntro(true);
  }, [hasIntro, result, statusLoading, isPremium]);

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

    setIsSending(true);

    try {
      const res = await fetch('/api/chat/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
            .concat({ role: 'user', content: userMessage.text }),
          isPremium, // Send premium status for gating
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.info('[chat-guide] reply', { status: data.masterStatus, bestSpot: data.bestSpot?.name });
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'I\'m here, but didn\'t get a response. Try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const botMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: 'Couldn\'t reach the guide. Try again in a moment.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpgrade = async (productKey: StripeProductKey = 'PREMIUM_24H') => {
    try {
      setUpgradeLoading(true);
      setUpgradeError(null);

      const email = prompt('Skriv inn e-postadressen din for kvittering:');
      if (!email) {
        setUpgradeLoading(false);
        return;
      }

      if (!email.includes('@')) {
        setUpgradeError('Ugyldig e-postadresse');
        setUpgradeLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('user_email', email);
      }

      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke åpne betalingsvindu');
      }

      if (!data.url) {
        throw new Error('Stripe returnerte ikke en betalingslenke');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Upgrade error:', error);
      setUpgradeError(
        error instanceof Error ? error.message : 'Betaling feilet, prøv igjen'
      );
    } finally {
      setUpgradeLoading(false);
    }
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
              <h3 className="text-white font-medium text-sm">Aurora Guide</h3>
              <p className="text-white/50 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {statusLoading ? 'Loading status...' : `Status: ${statusLabel}`}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white/50 hover:text-white transition-colors p-1"
            title="Close chat"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-black/20 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.map((msg) => {
            const hasLockIcon = msg.sender === 'bot' && msg.text.includes('🔒');
            return (
              <div key={msg.id}>
                <div
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
                {/* Upgrade CTA for locked features */}
                {hasLockIcon && !isPremium && (
                  <div className="flex flex-col justify-start mb-2 gap-2">
                    <button
                      onClick={() => handleUpgrade('PREMIUM_24H')}
                      disabled={upgradeLoading}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-purple-500 text-white text-xs font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {upgradeLoading ? 'Åpner Stripe...' : 'Unlock Premium • From 49 NOK'}
                    </button>
                    {upgradeError && (
                      <span className="text-[11px] text-red-300">
                        {upgradeError}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {isSending && (
            <div className="flex w-full mb-2 justify-start">
              <div className="bg-white/10 text-white/80 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/5">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-2.5 pr-12 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-light"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="absolute right-1.5 p-1.5 bg-primary rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
              title="Send message"
              aria-label="Send message"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>

      {/* Aura FAB Toggle */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div
          className={cn(
            "px-3 py-2 rounded-xl bg-black/60 border border-white/10 shadow-lg text-white/90 text-sm font-medium backdrop-blur-md hidden sm:block transition-all duration-200",
            isOpen && "opacity-0 translate-y-1 pointer-events-none"
          )}
        >
          Snakk med Aura
        </div>

        <button
          ref={auraTriggerRef}
          onClick={() => {
            const next = !isOpen;
            setIsOpen(next);
            if (next) console.info('[chat-guide] open');
          }}
          onMouseEnter={playAuraVideo}
          onMouseLeave={stopAuraVideo}
          onFocus={playAuraVideo}
          onBlur={stopAuraVideo}
          className={cn(
            "group relative flex items-center justify-center p-0 bg-transparent text-white transition-transform duration-300 pointer-events-auto hover:scale-105 active:scale-100 focus-visible:drop-shadow-[0_0_18px_rgba(52,245,197,0.8)] outline-none",
            isOpen && "scale-0 opacity-0"
          )}
          title="Snakk med Aura"
          aria-label="Snakk med Aura"
        >
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl bg-black/75 border border-white/10 text-sm text-white/90 shadow-lg opacity-0 translate-x-2 transition-all duration-200 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0">
            Snakk med Aura
          </div>
          <div className="relative w-72 h-72 flex items-center justify-center">
            <img
              src="/Aurahalo.png"
              alt="Aura"
              className={cn(
                "w-full h-full object-contain transition-opacity duration-200 drop-shadow-[0_8px_24px_rgba(52,245,197,0.35)]",
                showAuraVideo ? "opacity-0" : "opacity-100"
              )}
            />
            <video
              ref={auraVideoRef}
              className={cn(
                "absolute inset-0 w-full h-full object-contain transition-opacity duration-200 drop-shadow-[0_8px_24px_rgba(52,245,197,0.35)]",
                showAuraVideo ? "opacity-100" : "opacity-0"
              )}
              muted
              loop
              playsInline
              preload="metadata"
              poster="/Aurahalo.png"
              aria-hidden="true"
            >
              <source src="/Aura_interaktiv.mp4" type="video/mp4" />
            </video>
          </div>
        </button>
      </div>

      {/* Close FAB (visible when open) */}
       <button
        onClick={() => setIsOpen(false)}
        className={cn(
          "absolute bottom-0 right-0 flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 hover:scale-105 transition-all duration-300 pointer-events-auto",
          !isOpen && "scale-0 opacity-0 rotate-90"
        )}
        title="Close chat"
        aria-label="Close chat"
      >
        <X className="w-7 h-7" />
      </button>
    </div>
  );
}
