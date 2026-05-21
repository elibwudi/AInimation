'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function GenerateProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [status, setStatus] = useState<string>('initializing');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const pollId = setInterval(async () => {
      try {
        const res = await fetch(`/api/animations/${id}`);
        const json = await res.json();
        const data = json.data;
        
        if (data && data.status) {
          if (data.status === 'review' || data.status === 'published') {
            clearInterval(pollId);
            router.push(`/review/${id}`);
          } else if (data.status === 'error') {
            clearInterval(pollId);
            setStatus('error');
          } else {
            setStatus(data.status);
          }
        }
      } catch (err) {
        console.error('Poll error', err);
      }
    }, 2000);

    return () => clearInterval(pollId);
  }, [id, router]);

  const messages: Record<string, string> = {
    'initializing': '正在初始化生成管线',
    'draft': '正在读取剧本与结构要求',
    'generating': 'AI 正在自动扩写干货剧本并合成前端代码，这通常需要 30-60 秒',
    'error': 'AI 生成流程被阻断，遇到了未知错误，请检查后台日志。',
  };

  const isError = status === 'error';

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-12 rounded-3xl shadow-lg border border-slate-100 flex flex-col items-center max-w-lg w-full text-center relative overflow-hidden">
        {isError && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />
        )}
        <div className="relative mb-8">
          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${isError ? 'border-red-100 bg-red-50 text-red-500' : 'border-slate-100 text-blue-600'}`}>
            {isError ? (
              <AlertCircle className="w-10 h-10" />
            ) : (
              <Loader2 className="w-10 h-10 animate-spin" />
            )}
          </div>
          {!isError && <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" style={{ animationDuration: '3s' }}/>}
        </div>
        
        <h2 className={`text-2xl font-bold mb-3 ${isError ? 'text-red-600' : 'text-slate-800'}`}>
          {isError ? '生成作业失败' : `动画魔法正在生成${dots}`}
        </h2>
        <p className={`${isError ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
          {messages[status] || messages['generating']}
        </p>

        {!isError && (
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-10">
            <div className="bg-blue-600 h-full w-2/3 animate-pulse-slow rounded-full"></div>
          </div>
        )}

        {isError && (
          <button 
            onClick={() => router.push('/')}
            className="mt-10 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-sm font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4"/> 重新生成
          </button>
        )}
      </div>
    </div>
  );
}
