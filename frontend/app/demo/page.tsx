'use client';
import Link from 'next/link';

export default function DemoIndex() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-xl w-full text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">⚡</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">CRM Platform Demo</h1>
        <p className="text-slate-500 mb-10">Choose a form type to preview the public-facing experience</p>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/demo/standard" className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:shadow-md transition text-left group">
            <div className="text-3xl mb-3">📝</div>
            <h2 className="font-bold text-slate-900 group-hover:text-indigo-600 transition">Standard Form</h2>
            <p className="text-sm text-slate-500 mt-1">Traditional multi-field contact form with CAPTCHA protection</p>
          </Link>
          <Link href="/demo/ai" className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:shadow-md transition text-left group">
            <div className="text-3xl mb-3">🤖</div>
            <h2 className="font-bold text-slate-900 group-hover:text-indigo-600 transition">AI Conversational</h2>
            <p className="text-sm text-slate-500 mt-1">GPT-powered chat interface that guides users naturally</p>
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-8">← <Link href="/dashboard" className="hover:underline">Back to Dashboard</Link></p>
      </div>
    </div>
  );
}
