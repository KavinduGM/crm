'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import ContactPanel from './ContactPanel';
import { cn } from '@/lib/utils';

interface Props {
  business: { company_name: string; email?: string; social_links?: Record<string, string>; messaging_apps?: Record<string, string>; logo_url?: string };
  form: { name: string; branding: { primary_color: string; description: string }; contact_info?: { email?: string; messaging_apps?: Record<string, string>; social_links?: Record<string, string> }; thank_you_message: string };
  companySlug: string;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
  options?: string[];
}

type CollectedData = Record<string, string>;

export default function AiForm({ business, form, companySlug }: Props) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [starting, setStarting] = useState(true);
  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Honeypot — hidden from humans, bots fill it automatically
  const [honeypot, setHoneypot] = useState('');

  const primaryColor = form.branding?.primary_color || '#6366f1';
  const ci = form.contact_info || {};
  const email = ci.email || business.email || '';

  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startSession() {
    try {
      const res = await api.post(`/public/${companySlug}/ai/start`, { honeypot });
      const token = res.data.data.session_token;
      setSessionToken(token);
      // Send initial greeting
      await sendMessage('Hello, I would like to get in touch.', token, {});
    } catch {
      setMessages([{ role: 'assistant', content: "Sorry, I couldn't start the conversation. Please try refreshing." }]);
    } finally {
      setStarting(false);
    }
  }

  async function sendMessage(userMessage: string, token?: string, data?: CollectedData) {
    const activeToken = token || sessionToken;
    const activeData = data !== undefined ? data : collectedData;
    if (!activeToken) return;

    const userMsg: Message = { role: 'user', content: userMessage };
    if (token) {
      // Initial message - don't show user message
    } else {
      setMessages(prev => [...prev, userMsg]);
    }
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/public/ai/message', {
        session_token: activeToken,
        message: userMessage,
        collected_data: activeData,
      });

      const { message, is_complete } = res.data.data;

      // Parse options from message if present
      let parsedOptions: string[] | undefined;
      let cleanMessage = message;
      const optionsMatch = message.match(/\{"options":\s*\[[^\]]*\]\}/);
      if (optionsMatch) {
        try {
          const parsed = JSON.parse(optionsMatch[0]);
          parsedOptions = parsed.options;
          cleanMessage = message.replace(optionsMatch[0], '').trim();
        } catch { /* ignore parse error */ }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: cleanMessage, options: parsedOptions }]);

      if (is_complete) {
        setCompleted(true);
      }

      // Auto-detect collected data from message
      if (token) return; // Skip on first message
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  function handleOptionClick(option: string) {
    // Detect and store key data
    const lower = option.toLowerCase();
    const newData = { ...collectedData };
    if (lower.includes('@')) newData.email = option;
    else if (/^\+?\d[\d\s-]{7,}$/.test(option)) newData.phone = option;
    setCollectedData(newData);
    sendMessage(option);
  }

  function handleSend() {
    if (!input.trim() || sending) return;
    // Auto-detect key data from free text
    const text = input.trim();
    const newData = { ...collectedData };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) newData.email = text;
    else if (/^\+?\d[\d\s-]{7,}$/.test(text)) newData.phone = text;
    else if (Object.keys(newData).length === 0) newData.name = text; // First free text = name
    setCollectedData(newData);
    sendMessage(text);
  }

  if (completed) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6" style={{ backgroundColor: `${primaryColor}20` }}>
          ✅
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Thank You!</h2>
        <p className="text-slate-600">{form.thank_you_message}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row" style={{ height: '640px' }}>
        {/* Left: Chat */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0" style={{ backgroundColor: primaryColor }}>
              🤖
            </div>
            <div>
              <p className="font-semibold text-slate-900">{business.company_name}</p>
              <p className="text-xs text-green-500 font-medium">● Online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {starting && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0" style={{ backgroundColor: primaryColor }}>🤖</div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0 self-end" style={{ backgroundColor: primaryColor }}>🤖</div>
                )}
                <div className={cn('max-w-sm', msg.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col gap-2')}>
                  <div className={cn(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'text-white rounded-tr-none'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  )} style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                    {msg.content}
                  </div>
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.options.map((opt, j) => (
                        <button key={j} onClick={() => handleOptionClick(opt)}
                          className="px-3 py-1.5 text-sm border-2 rounded-xl font-medium transition hover:text-white"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = primaryColor; (e.target as HTMLElement).style.color = 'white'; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = ''; (e.target as HTMLElement).style.color = primaryColor; }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && !starting && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0" style={{ backgroundColor: primaryColor }}>🤖</div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-slate-100">
            {/* Honeypot — hidden from humans, bots fill it automatically */}
            <div aria-hidden="true" style={{ display: 'none' }}>
              <input
                type="text"
                name="honeypot"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your message..."
                disabled={sending || starting}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition disabled:opacity-50"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || starting}
                className="w-12 h-12 rounded-xl text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>

        {/* Right: Contact Panel */}
        <div className="lg:w-72 xl:w-80 flex-shrink-0">
          <ContactPanel
            companyName={business.company_name}
            email={email}
            primaryColor={primaryColor}
            messagingApps={ci.messaging_apps || business.messaging_apps}
            socialLinks={ci.social_links || business.social_links}
            logoUrl={business.logo_url}
          />
        </div>
      </div>
    </div>
  );
}
