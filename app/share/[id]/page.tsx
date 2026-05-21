'use client';
import React, { useEffect, useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/animations/${id}`)
      .then(r => r.json())
      .then(res => {
        if(res.success) setData(res.data);
      });
  }, [id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) return <div className="p-10 text-center animate-pulse text-slate-400">Loading interactive content...</div>;

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col pt-6 text-slate-200">
      <div className="max-w-7xl mx-auto w-full px-8 mb-4 flex items-end justify-between shrink-0">
        <div className="border-l-4 border-indigo-500 pl-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">{data.title}</h1>
          <p className="text-slate-500 text-[10px] mt-0.5 font-medium tracking-wider uppercase">
            {data.subject} <span className="mx-2 opacity-30">|</span> {new Date(data.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20 text-white active:scale-95">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '链接已复制' : '分享该网页'}
        </button>
      </div>

      <div className="flex-1 w-full bg-[#05070a] overflow-auto flex items-center justify-center p-10 border-t border-white/5 relative">
        {/* ── 1024x768 物理锁定容器 (正式展示页恢复居中) ── */}
        <div className="w-[1024px] h-[768px] shrink-0 bg-black rounded-xl relative shadow-[0_0_0_12px_rgba(255,255,255,0.03),0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden">
          {data.html ? (
            <iframe 
              srcDoc={data.html}
              className="w-full h-full border-none bg-white"
              style={{ width: '1024px', height: '768px' }}
              sandbox="allow-scripts allow-same-origin"
              title="Interactive Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              动画内容未找到或尚未生成
            </div>
          )}
          
          {/* 装饰性：边框内阴影，增强“屏幕”感 */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.4)] border border-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
