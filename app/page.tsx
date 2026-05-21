'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, PenLine, Clock, ChevronRight } from 'lucide-react';

// 8 种封面渐变色
const COVERS = [
  ['#2d1b6b','#4c1d95','#7c3aed'],
  ['#0c2a5e','#1e40af','#3b82f6'],
  ['#0f2e1a','#065f46','#10b981'],
  ['#3b0d1a','#7f1d1d','#dc2626'],
  ['#1a1040','#312e81','#6366f1'],
  ['#0a2340','#0369a1','#0ea5e9'],
  ['#26103a','#6b21a8','#a855f7'],
  ['#1a2000','#365314','#4d7c0f'],
];

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/animations')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setHistory(res.data.map((item: any) => ({
            ...item,
            title: item.title === 'Test Innovation' ? '创新科技动画演示' : item.title,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch('/api/animations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, overview: '', key_points: [], design_idea: '', language: 'zh-CN', subject: '' }),
      });
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      if (json.success) {
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: json.id }),
        }).catch(() => {});
        router.push(`/generate/${json.id}`);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    /* 首页专用居中背景容器 */
    <div className="home-page-wrapper">

      {/* ══════ 外框 ══════ */}
      <div className="app-frame w-full">


        {/* ── Hero 区域 ── */}
        <div className="hero-section">
          <div className="hero-bg" />
          <div className="hero-overlay" />

          {/* 左侧文字容器 (使用内联样式确保在 Tailwind v4 环境下的强力渲染) */}
          <div 
            className="relative z-10 h-full flex flex-col justify-center pr-10 pt-4"
            style={{ paddingLeft: '120px' }}
          >
            <div className="mb-10 flex flex-col gap-6">
              <h1 className="font-black tracking-tighter text-white uppercase flex items-center gap-4"
                  style={{ lineHeight: '1.1' }}>
                <span 
                  className="bg-white text-slate-900 px-5 py-2 rounded-none shadow-[12px_12px_0_0_rgba(79,70,229,0.5)] transform -rotate-1"
                  style={{ fontSize: '72px' }}
                >
                  无
                </span>
                <span className="border-b-4 border-indigo-500/50 pb-1"
                      style={{ fontSize: '36px' }}>
                  限创意，
                </span>
              </h1>
              <div className="font-black tracking-tighter uppercase">
                <span 
                  style={{ 
                    fontSize: '76px', 
                    lineHeight: '1.2',
                    display: 'block',
                    padding: '10px 0',
                    backgroundImage: 'linear-gradient(to right, #22d3ee, #818cf8, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  瞬间动画
                </span>
              </div>
            </div>
            <p 
              className="font-bold tracking-[0.5em] uppercase text-slate-400 mb-10 ml-2 border-l-4 border-indigo-500/50 pl-6 py-2"
              style={{ fontSize: '14px' }}
            >
              您的文字，我们的动画世界
            </p>

            {/* 搜索胶囊 (灵感岛风格) */}
            <form onSubmit={handleSubmit} className="max-w-xl group">
              <div className="search-pill-glow px-6 py-4 flex items-center gap-4">
                <input
                  required
                  type="text"
                  placeholder="输入创作指令，例如：'月球上的太空猫'…"
                  className="flex-1 text-sm font-medium placeholder:text-indigo-300/40 text-white min-w-0"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full px-3.5 py-1.5 flex items-center gap-1 transition-all active:scale-95"
                >
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                  {loading ? '…' : '生成'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── 精彩案例区 ── */}
        <div className="gallery-section">

          {/* 区域标题 */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black tracking-[0.15em] uppercase text-white/80">精彩案例</h2>
            {history.length > 0 && (
              <span className="text-[10px] text-slate-600 font-semibold tracking-wider">
                {history.length} 个 · 滚动查看更多
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-700 font-medium">
              生成结果将在这里显示
            </div>
          ) : (
            /* 固定尺寸 Grid：4列 × 固定宽度，gap 真实有效 */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 210px)',
              gap: '20px',
              justifyContent: 'center',
            }}>
              {history.map((item, i) => {
                const [c0, c1, c2] = COVERS[i % COVERS.length];
                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(item.status === 'published' ? `/share/${item.id}` : `/review/${item.id}`)}
                    className={`case-card group ${item.status !== 'published' ? 'is-draft' : ''}`}
                  >
                    {/* 固定封面区 */}
                    <div
                      className="card-cover"
                      style={{ background: `linear-gradient(135deg, ${c0} 0%, ${c1} 55%, ${c2} 100%)` }}
                    >
                      {/* 装饰圆 */}
                      <div className="absolute bottom-0 right-0 w-14 h-14 rounded-full opacity-25"
                        style={{ background: c2, filter: 'blur(14px)' }} />

                      {/* 动作按钮 */}
                      <div className="relative z-10 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-400 group-hover:scale-110 transition-all duration-300 shadow-xl">
                        {item.status === 'published' 
                          ? <Eye className="w-5 h-5 text-white" /> 
                          : <PenLine className="w-5 h-5 text-white" />
                        }
                      </div>

                      {/* 状态标签 */}
                      <div className="absolute top-2 right-2">
                        <span className={item.status === 'published' ? 'tag-pub' : 'tag-gen'}>
                          {item.status === 'published' ? '已发布' : '审阅中'}
                        </span>
                      </div>
                    </div>

                    {/* 固定信息区 */}
                    <div className="card-info flex flex-col justify-between">
                      <p className="text-[11px] font-bold text-slate-300 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1 text-slate-600 mt-1">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="text-[9px] font-medium">
                          {new Date(item.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


      </div>{/* end app-frame */}
    </div>
  );
}
