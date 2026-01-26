'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { useMasterStatus } from '@/contexts/MasterStatusContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuroraData } from '@/hooks/useAuroraData';
import { cn } from '@/lib/utils';
import type { StripeProductKey } from '@/lib/stripe';
import { SuggestedQuestions } from '@/components/chat/SuggestedQuestions';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}


export function ChatWidget() {
  const { status, result, isLoading: statusLoading } = useMasterStatus();
  const { isPremium, subscriptionTier } = usePremium();
  const { t } = useLanguage();
  const { selectedSpot } = useAuroraData();
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
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true); // Default true to prevent flash
  const [hasShownNudge, setHasShownNudge] = useState(false);
  const nudgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const statusLabel = useMemo(() => {
    if (!result) return t('loadingStatus');
    if (result.status === 'GO') return 'GO NOW';
    if (result.status === 'WAIT') return t('statusWait');
    return 'NO';
  }, [result, t]);

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

  // Load chat history from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || historyLoaded) return;

    try {
      const savedMessages = localStorage.getItem('aura_chat_history');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages) as Message[];
        // Only load if messages exist and are from last 24 hours
        const now = Date.now();
        const validMessages = parsed.filter(msg => {
          const msgTime = new Date(msg.timestamp).getTime();
          return now - msgTime < 24 * 60 * 60 * 1000; // 24 hours
        });

        if (validMessages.length > 0) {
          setMessages(validMessages);
          setHasIntro(true); // Prevent duplicate intro
        }
      }
    } catch (error) {
      // Corrupt data, clear it
      localStorage.removeItem('aura_chat_history');
    }

    setHistoryLoaded(true);
  }, [historyLoaded]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (typeof window === 'undefined' || !historyLoaded || messages.length === 0) return;

    try {
      // Only save last 50 messages to prevent localStorage overflow
      const messagesToSave = messages.slice(-50);
      localStorage.setItem('aura_chat_history', JSON.stringify(messagesToSave));
    } catch (error) {
      console.warn('[chat-history] Failed to save to localStorage:', error);
      // If quota exceeded, clear old messages
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        const reduced = messages.slice(-20);
        try {
          localStorage.setItem('aura_chat_history', JSON.stringify(reduced));
        } catch {
          localStorage.removeItem('aura_chat_history');
        }
      }
    }
  }, [messages, historyLoaded]);

  // Check localStorage for first-time visitor
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('aura_has_seen_welcome');
    setHasSeenWelcome(seen === 'true');
  }, []);

  // Context nudge: Show after 30 seconds idle (if chat not opened and no nudge shown this session)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if nudge already shown this session
    const nudgeShownSession = sessionStorage.getItem('aura_nudge_shown');
    if (nudgeShownSession === 'true') {
      setHasShownNudge(true);
      return;
    }

    // Don't set timer if chat is already open or nudge already shown
    if (isOpen || hasShownNudge) {
      if (nudgeTimerRef.current) {
        clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = null;
      }
      return;
    }

    // Set 30-second idle timer
    nudgeTimerRef.current = setTimeout(() => {
      if (!isOpen && !hasShownNudge && result) {
        // Open chat with nudge message
        setIsOpen(true);
        const nudgeText =
          result.status === 'GO'
            ? t('strongActivityNow')
            : result.status === 'WAIT'
            ? t('activityBuilding')
            : t('checkForecast');

        setMessages([
          {
            id: `nudge-${Date.now()}`,
            text: nudgeText,
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
        setHasIntro(true);
        setHasShownNudge(true);
        sessionStorage.setItem('aura_nudge_shown', 'true');
      }
    }, 30000); // 30 seconds

    return () => {
      if (nudgeTimerRef.current) {
        clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = null;
      }
    };
  }, [isOpen, hasShownNudge, result]);

  // Context nudge: Master Status change (GO → WAIT or WAIT → GO)
  useEffect(() => {
    if (!result || hasShownNudge || isOpen) return;

    const currentStatus = result.status;
    const previousStatus = previousStatusRef.current;

    // Update ref
    previousStatusRef.current = currentStatus;

    // Only trigger nudge on meaningful transitions
    if (previousStatus && previousStatus !== currentStatus) {
      const isSignificantChange =
        (previousStatus === 'GO' && currentStatus === 'WAIT') ||
        (previousStatus === 'WAIT' && currentStatus === 'GO');

      if (isSignificantChange) {
        setIsOpen(true);
        const changeText =
          currentStatus === 'GO'
            ? t('conditionsImproved')
            : t('conditionsWorsened');

        setMessages([
          {
            id: `status-change-${Date.now()}`,
            text: changeText,
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
        setHasIntro(true);
        setHasShownNudge(true);
        sessionStorage.setItem('aura_nudge_shown', 'true');
      }
    }
  }, [result, hasShownNudge, isOpen]);

  // Show welcome flow for first-time visitors (after opening chat)
  useEffect(() => {
    if (hasSeenWelcome || !isOpen || hasIntro) return;

    const welcomeMessages: Message[] = [
      {
        id: 'welcome-1',
        text: t('welcomeMessage1'),
        sender: 'bot',
        timestamp: new Date(),
      },
      {
        id: 'welcome-2',
        text: t('welcomeMessage2'),
        sender: 'bot',
        timestamp: new Date(Date.now() + 100),
      },
      {
        id: 'welcome-3',
        text: t('welcomeMessage3'),
        sender: 'bot',
        timestamp: new Date(Date.now() + 200),
      },
    ];

    setMessages(welcomeMessages);
    setHasIntro(true);

    // Mark as seen
    if (typeof window !== 'undefined') {
      localStorage.setItem('aura_has_seen_welcome', 'true');
      setHasSeenWelcome(true);
    }
  }, [hasSeenWelcome, isOpen, hasIntro]);

  // Inject a status-based intro once the Master Status is ready (for returning visitors)
  useEffect(() => {
    if (hasIntro || statusLoading || !result) return;
    if (!hasSeenWelcome) return; // Skip if welcome flow will handle it

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
  }, [hasIntro, result, statusLoading, isPremium, hasSeenWelcome]);

  const sendQuickReply = (text: string) => {
    setInputText(text);
    // Trigger send immediately
    setTimeout(() => {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      document.querySelector('form')?.dispatchEvent(event);
    }, 100);
  };

  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setShowQuickReplies(true);
    }, 20000); // 20 seconds idle
  };

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
    setShowQuickReplies(false); // Hide quick replies after first user message
    resetIdleTimer(); // Start idle timer

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
          spotId: selectedSpot.id,
          lat: selectedSpot.latitude,
          lon: selectedSpot.longitude,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.info('[chat-guide] reply', { status: data.masterStatus, bestSpot: data.bestSpot?.name });

      let botReply = data.reply || 'I\'m here, but didn\'t get a response. Try again.';

      // Parse [SPOT:id] tokens for map guidance
      const spotTokenRegex = /\[SPOT:([a-z-]+)\]/gi;
      const spotMatches = botReply.matchAll(spotTokenRegex);

      for (const match of spotMatches) {
        const spotId = match[1];

        // Emit map guidance event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('aura-guide-spot', {
              detail: {
                spotId,
                zoom: 11,
                highlight: true
              }
            })
          );
          console.info('[chat-guide] emitted aura-guide-spot', { spotId });
        }
      }

      // Parse [GUIDE:element-id:message] tokens for UI guidance
      const guideTokenRegex = /\[GUIDE:([a-z-]+):([^\]]+)\]/gi;
      const guideMatches = botReply.matchAll(guideTokenRegex);

      for (const match of guideMatches) {
        const elementId = match[1];
        const message = match[2];

        // Emit UI guidance event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('aura-ui-guide', {
              detail: {
                elementId,
                message,
                pulseColor: 'rgb(52, 245, 197)'
              }
            })
          );
          console.info('[chat-guide] emitted aura-ui-guide', { elementId, message });
        }
      }

      // Parse [LINK:path:text] tokens for navigation links
      const linkTokenRegex = /\[LINK:(\/[^:]+):([^\]]+)\]/gi;
      const linkMatches = botReply.matchAll(linkTokenRegex);

      for (const match of linkMatches) {
        const path = match[1];
        const text = match[2];

        // Replace with clickable link
        botReply = botReply.replace(
          match[0],
          `<a href="${path}" class="text-teal-400 underline hover:text-teal-300 font-medium">${text} →</a>`
        );
      }

      // Remove [SPOT:id] and [GUIDE:...] tokens from display text
      botReply = botReply
        .replace(spotTokenRegex, '')
        .replace(guideTokenRegex, '')
        .trim();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botReply,
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

  const handleClearHistory = () => {
    if (typeof window === 'undefined') return;

    const confirmed = confirm(t('confirmDeleteChat'));
    if (!confirmed) return;

    setMessages([]);
    setHasIntro(false);
    localStorage.removeItem('aura_chat_history');
  };

  const handleUpgrade = async (productKey: StripeProductKey = 'PREMIUM_24H') => {
    try {
      setUpgradeLoading(true);
      setUpgradeError(null);

      const email = prompt(t('enterEmailForReceipt'));
      if (!email) {
        setUpgradeLoading(false);
        return;
      }

      if (!email.includes('@')) {
        setUpgradeError(t('invalidEmail'));
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
        throw new Error(data.error || t('couldNotOpenPayment'));
      }

      if (!data.url) {
        throw new Error(t('couldNotOpenPayment'));
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Upgrade error:', error);
      setUpgradeError(
        error instanceof Error ? error.message : t('paymentFailed')
      );
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none">
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
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-white/40 hover:text-white transition-colors p-1"
                title="Clear chat history"
                aria-label="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white transition-colors p-1"
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                </div>
                {/* Upgrade CTA for locked features */}
                {hasLockIcon && !isPremium && (
                  <div className="flex flex-col justify-start mb-2 gap-2">
                    <button
                      onClick={() => handleUpgrade('PREMIUM_24H')}
                      disabled={upgradeLoading}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-purple-500 text-white text-xs font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {upgradeLoading ? t('openingStripe') : 'Unlock Premium • From 49 NOK'}
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
        <form onSubmit={handleSendMessage} className="border-t border-white/10 bg-white/5">
          {/* Suggested Questions */}
          {showQuickReplies && (
            <div className="p-3 pb-2 border-b border-white/5">
              <SuggestedQuestions
                masterStatus={result?.status}
                onSelect={(question) => sendQuickReply(question)}
              />
            </div>
          )}

          <div className="relative flex items-center p-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('typeMessage')}
              className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-2.5 pr-12 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-light"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="absolute right-1.5 p-1.5 bg-primary rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
              title={t('sendMessage')}
              aria-label={t('sendMessage')}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>

      {/* Aura FAB Toggle */}
      <div className="flex items-center gap-3 pointer-events-auto">
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
          title={t('chatWithAura')}
          aria-label={t('chatWithAura')}
        >
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <img
              src="/Aurahalo.png"
              alt="Aura"
              className={cn(
                "w-full h-full object-contain transition-opacity duration-200",
                showAuraVideo ? "opacity-0" : "opacity-100"
              )}
            />
            <video
              ref={auraVideoRef}
              className={cn(
                "absolute inset-0 w-full h-full object-contain transition-opacity duration-200",
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
        title={t('closeChat')}
        aria-label={t('closeChat')}
      >
        <X className="w-7 h-7" />
      </button>
    </div>
  );
}
