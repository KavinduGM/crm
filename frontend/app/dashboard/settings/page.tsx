'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function IconSettings({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconKey({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}
function IconCheck({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconTestTube({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 3v11.5A3.5 3.5 0 0012.5 18h0A3.5 3.5 0 0016 14.5V3M9 3h7M9 3H7m9 0h2" />
    </svg>
  );
}
function IconEye({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
function IconEyeOff({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

interface SettingsMeta {
  claude_key_source: 'database' | 'environment' | 'none';
  claude_key_configured: boolean;
}

export default function SettingsPage() {
  const [claudeKey, setClaudeKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [meta, setMeta] = useState<SettingsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await api.get('/admin/settings');
      setMeta(res.data.meta);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!claudeKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    setSaving(true);
    try {
      await api.put('/admin/settings', { claude_api_key: claudeKey.trim() });
      toast.success('Settings saved! New key is active immediately.');
      setClaudeKey('');
      setTestResult(null);
      await fetchSettings();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save settings';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/admin/settings/test-claude');
      setTestResult({ success: true, message: res.data.message });
      toast.success('Claude API connection verified!');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Connection test failed';
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  }

  async function handleClear() {
    if (!confirm('Remove the database API key? The system will fall back to the .env key.')) return;
    setSaving(true);
    try {
      await api.put('/admin/settings', { claude_api_key: '' });
      toast.success('Database key cleared. Using .env fallback.');
      setClaudeKey('');
      setTestResult(null);
      await fetchSettings();
    } catch {
      toast.error('Failed to clear key');
    } finally {
      setSaving(false);
    }
  }

  const sourceLabel: Record<string, { text: string; cls: string }> = {
    database: { text: 'Custom key (saved in database)', cls: 'bg-green-50 text-green-700' },
    environment: { text: 'Default key (.env file)', cls: 'bg-blue-50 text-blue-700' },
    none: { text: 'No key configured', cls: 'bg-red-50 text-red-700' },
  };
  const src = meta ? sourceLabel[meta.claude_key_source] : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <IconSettings className="w-6 h-6 text-slate-600" /> Admin Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage API keys and system configuration.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">

          {/* Status Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <IconKey className="w-5 h-5 text-blue-700" /> Claude AI (Anthropic) API Key
            </h2>

            <div className="flex items-center gap-3 mb-6">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium ${meta?.claude_key_configured ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {meta?.claude_key_configured ? (
                  <><IconCheck className="w-4 h-4" /> API Key Active</>
                ) : (
                  <><span className="w-4 h-4 inline-block text-center font-bold">!</span> Not Configured</>
                )}
              </div>
              {src && (
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${src.cls}`}>
                  {src.text}
                </span>
              )}
            </div>

            {/* Test button */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleTest}
                disabled={testing || !meta?.claude_key_configured}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                <IconTestTube className="w-4 h-4" />
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult && (
                <span className={`text-sm font-medium ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.success ? '✓ ' : '✗ '}{testResult.message}
                </span>
              )}
            </div>

            {/* Set new key form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Set New API Key
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Enter a new Anthropic Claude API key. It will be saved to the database and take effect immediately — no server restart needed.
                </p>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={claudeKey}
                    onChange={e => setClaudeKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || !claudeKey.trim()}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save API Key'}
                </button>
                {meta?.claude_key_source === 'database' && (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={saving}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Clear DB Key
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
            <h3 className="font-semibold text-blue-900 text-sm mb-2">How API Key Resolution Works</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Database key (set via this page) — highest priority</li>
              <li>Environment variable <code className="bg-blue-100 px-1 rounded text-xs">CLAUDE_API_KEY</code> in backend/.env — fallback</li>
              <li>If neither is set — AI analysis is disabled, leads are marked for manual review</li>
            </ol>
            <p className="text-xs text-blue-700 mt-3">
              Changes to the database key take effect on the very next form submission — no restart required.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
