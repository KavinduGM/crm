'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Props {
  onVerified: (captchaId: string, answer: string) => void;
  onReset?: () => void;
  primaryColor?: string;
}

export default function CaptchaWidget({ onVerified, onReset, primaryColor = '#6366f1' }: Props) {
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCaptcha();
  }, []);

  async function loadCaptcha() {
    setLoading(true);
    setError('');
    setAnswer('');
    setVerified(false);
    try {
      const res = await api.get('/captcha/question');
      setCaptchaId(res.data.data.captchaId);
      setQuestion(res.data.data.question);
    } catch {
      setError('Could not load question. You can still submit the form.');
    } finally {
      setLoading(false);
    }
  }

  // Fix 3: Use a plain button click handler — NOT a nested <form> which causes
  // the outer StandardForm to refresh and lose all filled data.
  function handleVerify() {
    if (!answer.trim()) {
      setError('Please type something to verify you are human.');
      return;
    }
    if (!captchaId) return;
    setVerified(true);
    onVerified(captchaId, answer.trim());
  }

  function handleReset() {
    setVerified(false);
    setAnswer('');
    setCaptchaId(null);
    loadCaptcha();
    onReset?.();
  }

  if (loading) return (
    <div className="border border-slate-200 rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-48 mb-3" />
      <div className="h-10 bg-slate-200 rounded" />
    </div>
  );

  if (verified) return (
    <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-3">
      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0 text-sm font-bold">✓</div>
      <div>
        <p className="text-sm font-medium text-green-700">Verification complete</p>
        <button type="button" onClick={handleReset} className="text-xs text-green-600 underline mt-0.5">
          Change answer
        </button>
      </div>
    </div>
  );

  return (
    // Fix 3: No nested <form> — using a plain <div> to prevent the parent form
    // from being submitted/refreshed when the Verify button is clicked.
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>
          ?
        </div>
        <p className="text-sm font-medium text-slate-700">Quick Check</p>
        <span className="ml-auto text-xs text-slate-400">Optional</span>
      </div>

      {/* Question */}
      {question && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 text-sm text-slate-800 font-medium">
          {question}
        </div>
      )}

      {/* Answer + controls — plain div, NOT a nested form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={answer}
          onChange={e => { setAnswer(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleVerify(); } }}
          placeholder="Your answer..."
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 transition bg-white"
          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleVerify}
          className="px-4 py-2 text-sm text-white font-medium rounded-lg transition flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          Verify
        </button>
        <button
          type="button"
          onClick={loadCaptcha}
          className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-white transition flex-shrink-0"
          title="New question"
        >
          ↻
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <p className="text-xs text-slate-400 mt-2">Answer to confirm you&apos;re human — any answer is fine.</p>
    </div>
  );
}
