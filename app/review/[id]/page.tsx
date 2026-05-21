'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send, ArrowLeft, Globe, Loader2, Brain, MessageSquare,
  FileText, Zap, ChevronRight, Play, AlertTriangle, Sparkles,
  Palette, Settings2, BookOpen, HelpCircle, ChevronDown,
  ChevronUp, CheckCircle2, Pencil, X, Check
} from 'lucide-react';

// ─── 意图类型 ─────────────────────────────────────────────
const INTENTS = [
  { id: 'visual',      label: '视觉风格', icon: Palette,   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', placeholder: '描述您期望的视觉效果，例如：更暗的夜间模式、更圆润的按钮、更宽松的字体排版...', hint: '提示：可以描述配色、字体、间距、圆角等视觉感受' },
  { id: 'interaction', label: '功能交互', icon: Settings2,  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)',   placeholder: '描述您期望的功能改动，例如：增加重置按钮、滑块加数字输入框、增加暂停功能...', hint: '提示：可以描述按钮、滑块、表单、交互逻辑等操作型改动' },
  { id: 'content',     label: '知识内容', icon: BookOpen,   color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)',   placeholder: '描述您期望的内容调整，例如：调整某个公式的表达方式、修改动画中的文字说明...', hint: '提示：可以描述文字、公式、知识点顺序、例子等内容型改动' },
  { id: 'other',       label: '其他问题', icon: HelpCircle, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', placeholder: '请描述您遇到的问题或想要的改动...',            hint: '提示：任何未分类的改动或技术问题均可在此描述' },
];

// ─── 分组快捷指令 ─────────────────────────────────────────
const GROUPED_COMMANDS: Record<string, string[]> = {
  visual: [
    '把整体配色换为深色夜间模式',
    '改为明亮简洁的白色主题',
    '按钮做得更大更圆润，增加发光效果',
    '字体放大30%，排版更宽松',
    '背景增加流光波纹动效',
    '所有颜色调整为温暖的暖橙色调',
  ],
  interaction: [
    '增加一个"重置"按钮恢复初始值',
    '滑块增加数字输入框支持精确输入',
    '动画速度整体减慢到60%',
    '增加一个"暂停/继续"按钮',
    '增加数据可视化的实时图表',
    '给所有可点击元素增加过渡动画效果',
  ],
  content: [
    '将文字说明改得更通俗易懂',
    '增加一个概念解释模块',
    '将关键步骤标注得更清晰',
    '增加一个"学习提示"弹窗',
  ],
  other: [
    '修复当前的显示错误',
    '优化整体的加载性能',
    '增加无障碍访问支持',
  ],
};

// ─── 蓝图卡片定义 ─────────────────────────────────────────
const BLUEPRINT_CARDS = [
  { id: 'difficulty', title: '核心难点', icon: AlertTriangle, field: 'core_difficulty' },
  { id: 'overview',   title: '教案大纲', icon: BookOpen,      field: 'overview' },
  { id: 'scene',      title: '场景布局', icon: Sparkles,      field: 'scene' },
  { id: 'actors',     title: '演员设定', icon: Brain,          field: 'actors' },
  { id: 'logic',      title: '交互逻辑', icon: Zap,            field: 'logic' },
  { id: 'effects',    title: '视觉特效', icon: Palette,        field: 'effects' },
];

// ─── 解析蓝图文本 ─────────────────────────────────────────
function parseDesignSections(text: string): Record<string, string> {
  const keys = ['scene', 'actors', 'logic', 'effects'];
  const parts = text.split(/### \d+\.\s*/);
  const result: Record<string, string> = { scene: '', actors: '', logic: '', effects: '' };
  parts.forEach((part, idx) => { if (idx > 0 && keys[idx - 1]) result[keys[idx - 1]] = part.trim(); });
  return result;
}

type RefineHistoryItem = { feedback: string; timestamp: string };

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'chat' | 'blueprint'>('chat');
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [commandsExpanded, setCommandsExpanded] = useState<Record<string, boolean>>({ visual: true, interaction: false, content: false, other: false });

  const [editOverview, setEditOverview] = useState('');
  const [editDesign, setEditDesign] = useState('');
  const [editCoreDifficulty, setEditCoreDifficulty] = useState('');
  const [cardEditState, setCardEditState] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({ difficulty: true, overview: false, scene: false, actors: false, logic: false, effects: false });
  const [editingCards, setEditingCards] = useState<Record<string, boolean>>({});

  const [refining, setRefining] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refineHistory, setRefineHistory] = useState<RefineHistoryItem[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/animations/${id}`);
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        setData(d);
        setEditOverview(d.overview || '');
        setEditCoreDifficulty(d.core_difficulty || '');
        setEditDesign(d.design_idea || '');
        const sections = parseDesignSections(d.design_idea || '');
        setCardEditState({ overview: d.overview || '', core_difficulty: d.core_difficulty || '', ...sections });
      }
    } catch (err) { console.error('加载失败', err); }
  };

  useEffect(() => { loadData(); }, [id]);

  const currentIntentObj = INTENTS.find(i => i.id === selectedIntent);

  const handleRefine = async () => {
    if (!feedback.trim()) return;
    setRefining(true);
    try {
      const intentPrefix = currentIntentObj ? `[${currentIntentObj.label}]: ` : '';
      const res = await fetch('/api/generate/refine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, feedback: intentPrefix + feedback })
      });
      const json = await res.json();
      if (json.success) {
        setRefineHistory(prev => [{ feedback: intentPrefix + feedback, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
        setFeedback('');
        setSelectedIntent(null);
        await loadData();
      } else { alert('修改失败: ' + json.error); }
    } catch { alert('网络错误'); }
    setRefining(false);
  };

  const handleRegenerate = async () => {
    setIsSaving(true); setRefining(true);
    try {
      const designText = `### 1. 场景布局\n${cardEditState.scene || ''}\n\n### 2. 演员设定\n${cardEditState.actors || ''}\n\n### 3. 交互逻辑\n${cardEditState.logic || ''}\n\n### 4. 视觉特效\n${cardEditState.effects || ''}`;
      const updateRes = await fetch(`/api/animations/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overview: cardEditState.overview || editOverview, design_idea: designText, core_difficulty: cardEditState.core_difficulty || editCoreDifficulty })
      });
      if (!updateRes.ok) throw new Error('保存失败');
      const genRes = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, skipExpansion: true }) });
      if (genRes.ok) router.push(`/generate/${id}`);
      else alert('重构失败');
    } catch (err: any) { alert('操作失败: ' + err.message); }
    setIsSaving(false); setRefining(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/animations/${id}/publish`, { method: 'POST' });
      const json = await res.json();
      if (json.success) router.push(`/share/${id}`); else alert('发布失败');
    } catch { alert('网络错误'); }
    setPublishing(false);
  };

  const getCardContent = (field: string) => cardEditState[field] || '';
  const hasContent = (field: string) => getCardContent(field).trim().length > 10;

  if (!data) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#090c14]">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">正在进入审阅舱...</p>
      </div>
    </div>
  );

  const inset0 = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

  const visibleCommandGroups = selectedIntent
    ? [[selectedIntent, GROUPED_COMMANDS[selectedIntent]], ...Object.entries(GROUPED_COMMANDS).filter(([k]) => k !== selectedIntent)]
    : Object.entries(GROUPED_COMMANDS);

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', background: '#08090e', overflow: 'hidden' }}>

      {/* ─── 左侧演示区 ────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '40px', overflow: 'auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '28px', left: '32px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 10 }}>
          <button onClick={() => router.push('/')} style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7a8496' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#c8d0e0', fontWeight: 800, fontSize: '16px' }}>{data.title}</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)', flexShrink: 0 }} />
          </div>
        </div>

        <div style={{ width: '1024px', height: '768px', position: 'relative', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
          {refining && (
            <div style={{ ...inset0, zIndex: 50, background: 'rgba(8,9,14,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              <Loader2 size={48} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#818cf8', fontWeight: 700, letterSpacing: '0.3em', fontSize: '14px' }}>正在同步量子底座...</p>
            </div>
          )}
          {data.html
            ? <iframe ref={iframeRef} srcDoc={data.html} style={{ position: 'absolute', inset: 0, width: '1024px', height: '768px', border: 'none', background: 'white' }} sandbox="allow-scripts allow-same-origin" title="Preview" />
            : <div style={{ ...inset0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a3040' }}><AlertTriangle size={48} /></div>
          }
          <div style={{ ...inset0, pointerEvents: 'none', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)' }} />
        </div>
      </div>

      {/* ─── 右侧智脑面板 ──────────────────────────────── */}
      <div style={{ width: '500px', flexShrink: 0, background: '#0e111a', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* 面板顶栏 */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={22} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <div style={{ color: '#c8d0e0', fontWeight: 800, fontSize: '15px', letterSpacing: '0.05em' }}>智脑协同中心</div>
              <div style={{ color: '#818cf8', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', marginTop: '2px', textTransform: 'uppercase' }}>AI Review Studio</div>
            </div>
          </div>
          <button onClick={handlePublish} disabled={refining || publishing}
            style={{ padding: '8px 20px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '12px', color: '#818cf8', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: (refining || publishing) ? 0.5 : 1 }}>
            {publishing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={16} />}
            发布
          </button>
        </div>

        {/* 主标签 */}
        <div style={{ display: 'flex', padding: '16px 28px 0', gap: '8px', flexShrink: 0 }}>
          {([{ key: 'chat', icon: MessageSquare, label: '对话快修' }, { key: 'blueprint', icon: FileText, label: '修改蓝图' }] as const).map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ flex: 1, padding: '12px', borderRadius: '14px 14px 0 0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s',
                background: activeTab === key ? 'rgba(129,140,248,0.12)' : 'transparent',
                color: activeTab === key ? '#818cf8' : '#4a5568',
                borderBottom: activeTab === key ? '2px solid #818cf8' : '2px solid transparent'
              }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* ══ 内容区（可滚动）══════════════════════════ */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="review-scroll">

          {/* ── 对话快修 ── */}
          {activeTab === 'chat' && (
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

              {/* 策略一：意图选择器 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ color: '#5a6478', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>我想要...</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {INTENTS.map(intent => {
                    const Icon = intent.icon;
                    const isSelected = selectedIntent === intent.id;
                    return (
                      <button key={intent.id} onClick={() => setSelectedIntent(isSelected ? null : intent.id)}
                        style={{ padding: '14px 16px', borderRadius: '16px', border: `1px solid ${isSelected ? intent.border : 'rgba(255,255,255,0.06)'}`, background: isSelected ? intent.bg : 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', textAlign: 'left' }}>
                        <Icon size={18} style={{ color: isSelected ? intent.color : '#4a5568', flexShrink: 0, transition: 'color 0.2s' }} />
                        <span style={{ color: isSelected ? intent.color : '#7a8496', fontWeight: 700, fontSize: '13px', flex: 1 }}>{intent.label}</span>
                        {isSelected && <CheckCircle2 size={14} style={{ color: intent.color, flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
                {currentIntentObj && <div style={{ fontSize: '11px', color: '#4a5568', padding: '0 4px' }}>{currentIntentObj.hint}</div>}
              </div>

              {/* 输入区 */}
              <div style={{ position: 'relative' }}>
                <textarea
                  rows={4}
                  placeholder={currentIntentObj?.placeholder || '选择上方的意图类型，或直接描述您的修改需求...'}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRefine(); }}
                  style={{ width: '100%', borderRadius: '20px', border: `1px solid ${currentIntentObj ? currentIntentObj.border : 'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.03)', color: '#c8d0e0', padding: '18px 70px 18px 20px', fontSize: '15px', fontWeight: 500, lineHeight: 1.8, resize: 'none', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <button onClick={handleRefine} disabled={!feedback.trim() || refining}
                  style={{ position: 'absolute', right: '12px', bottom: '12px', width: '46px', height: '46px', borderRadius: '14px', border: 'none', background: feedback.trim() && !refining ? (currentIntentObj?.color || '#818cf8') : 'rgba(255,255,255,0.05)', color: feedback.trim() && !refining ? 'white' : '#2a3040', cursor: feedback.trim() && !refining ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {refining ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
                </button>
              </div>

              {/* 策略三：分组快捷指令 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ color: '#5a6478', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>快捷指令</div>
                {visibleCommandGroups.map(([groupKey, commands]) => {
                  const intentDef = INTENTS.find(i => i.id === groupKey);
                  const isHighlighted = groupKey === selectedIntent;
                  const isExpanded = isHighlighted || (commandsExpanded[groupKey] ?? false);
                  const GIcon = intentDef?.icon || HelpCircle;
                  return (
                    <div key={groupKey} style={{ borderRadius: '16px', border: `1px solid ${isHighlighted ? (intentDef?.border || 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.05)'}`, background: isHighlighted ? (intentDef?.bg || 'transparent') : 'rgba(255,255,255,0.02)', overflow: 'hidden', transition: 'all 0.3s' }}>
                      <button onClick={() => setCommandsExpanded(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                        style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <GIcon size={14} style={{ color: isHighlighted ? (intentDef?.color || '#818cf8') : '#4a5568', flexShrink: 0 }} />
                        <span style={{ color: isHighlighted ? (intentDef?.color || '#818cf8') : '#5a6478', fontWeight: 700, fontSize: '12px', flex: 1, textAlign: 'left' }}>{intentDef?.label || groupKey}</span>
                        {isHighlighted && <span style={{ fontSize: '10px', color: intentDef?.color, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>推荐</span>}
                        {isExpanded ? <ChevronUp size={14} style={{ color: '#4a5568' }} /> : <ChevronDown size={14} style={{ color: '#4a5568' }} />}
                      </button>
                      {isExpanded && (
                        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {(commands as string[]).map((cmd: string, i: number) => {
                            const isAdded = feedback.includes(cmd);
                            return (
                              <button key={i} onClick={() => {
                                if (isAdded) {
                                  // 取消：移除该指令（兼容首条和追加条）
                                  setFeedback(prev =>
                                    prev === cmd ? '' :
                                    prev.replace('、' + cmd, '').replace(cmd + '、', '').replace(cmd, '').trim()
                                  );
                                } else {
                                  // 追加：已有内容则用顿号连接，否则直接设置
                                  setFeedback(prev => prev.trim() ? prev.trim() + '、' + cmd : cmd);
                                }
                              }}
                                style={{ padding: '10px 14px', borderRadius: '12px', border: `1px solid ${isAdded ? 'rgba(129,140,248,0.35)' : 'rgba(255,255,255,0.04)'}`, background: isAdded ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.02)', color: isAdded ? '#818cf8' : '#7a8496', fontSize: '13px', fontWeight: isAdded ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span>{cmd}</span>
                                {isAdded && <span style={{ fontSize: '16px', color: '#818cf8', lineHeight: 1, flexShrink: 0 }}>✓</span>}
                              </button>
                            );
                          })}

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 修改历史 */}
              {refineHistory.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ color: '#5a6478', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>最近修改</div>
                  {refineHistory.map((h, i) => (
                    <div key={i} style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderLeft: '3px solid rgba(129,140,248,0.4)' }}>
                      <div style={{ color: '#7a8496', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.6 }}>"{h.feedback}"</div>
                      <div style={{ color: '#3a4358', fontSize: '11px', marginTop: '6px', fontWeight: 700 }}>{h.timestamp}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 修改蓝图 ── */}
          {activeTab === 'blueprint' && (
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ color: '#5a6478', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>策略蓝图卡片</div>

              {/* 策略六：蓝图卡片化 */}
              {BLUEPRINT_CARDS.map(card => {
                const isExpanded = expandedCards[card.id];
                const isEditing = editingCards[card.id];
                const content = getCardContent(card.field);
                const hasCnt = hasContent(card.field);
                const CardIcon = card.icon;

                return (
                  <div key={card.id} style={{ borderRadius: '20px', border: `1px solid ${hasCnt ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.05)'}`, background: isExpanded ? 'rgba(129,140,248,0.04)' : 'rgba(255,255,255,0.02)', overflow: 'hidden', transition: 'all 0.3s' }}>
                    <div onClick={() => setExpandedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }))} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: hasCnt ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${hasCnt ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CardIcon size={18} style={{ color: hasCnt ? '#818cf8' : '#3a4358' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#c8d0e0', fontWeight: 700, fontSize: '14px' }}>{card.title}</div>
                        {!isExpanded && hasCnt && <div style={{ color: '#5a6478', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>{content.split('\n')[0].replace(/^#{1,3}\s*/, '')}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {hasCnt
                          ? <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 10px', borderRadius: '99px', fontWeight: 700 }}>已完善</span>
                          : <span style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 10px', borderRadius: '99px', fontWeight: 700 }}>待填写</span>
                        }
                        {isExpanded ? <ChevronUp size={16} style={{ color: '#4a5568' }} /> : <ChevronDown size={16} style={{ color: '#4a5568' }} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px' }}>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {isEditing ? (
                            <>
                              <textarea value={cardEditState[card.field] || ''} onChange={e => setCardEditState(prev => ({ ...prev, [card.field]: e.target.value }))}
                                rows={6} style={{ width: '100%', borderRadius: '14px', border: '1px solid rgba(129,140,248,0.3)', background: 'rgba(0,0,0,0.4)', color: '#c8d0e0', padding: '14px 16px', fontSize: '14px', lineHeight: 1.8, resize: 'vertical', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setEditingCards(prev => ({ ...prev, [card.id]: false }))} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <Check size={14} /> 完成
                                </button>
                                <button onClick={() => { setCardEditState(prev => ({ ...prev, [card.field]: content })); setEditingCards(prev => ({ ...prev, [card.id]: false })); }} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#5a6478', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <X size={14} />
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ color: '#8a95aa', fontSize: '14px', lineHeight: 1.9, whiteSpace: 'pre-wrap', minHeight: '60px' }}>
                                {content || <span style={{ color: '#2a3040', fontStyle: 'italic' }}>暂无内容，点击"编辑"填写...</span>}
                              </div>
                              <button onClick={() => setEditingCards(prev => ({ ...prev, [card.id]: true }))} style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#7a8496', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Pencil size={12} /> 编辑
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* REGENESIS 仅在修改蓝图 Tab 显示 */}
              <div style={{ paddingTop: '8px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '14px 18px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: '#5a6478', fontSize: '12px', lineHeight: 1.7 }}>✅ 在上方卡片中完成蓝图修改后，点击下方按钮将依据新蓝图全量重建动画。</div>
                </div>
                <button onClick={handleRegenerate} disabled={refining || isSaving}
                  style={{ width: '100%', padding: '18px', borderRadius: '20px', border: 'none', background: (refining || isSaving) ? 'rgba(129,140,248,0.1)' : 'linear-gradient(135deg, #6d28d9 0%, #818cf8 100%)', color: 'white', fontWeight: 800, fontSize: '15px', letterSpacing: '0.1em', cursor: (refining || isSaving) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s', boxShadow: (refining || isSaving) ? 'none' : '0 16px 40px rgba(109,40,217,0.3)', opacity: (refining || isSaving) ? 0.6 : 1 }}>
                  {isSaving ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={22} style={{ fill: 'white' }} />}
                  同步底座重构 (REGENESIS)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .review-scroll::-webkit-scrollbar { width: 4px; }
        .review-scroll::-webkit-scrollbar-track { background: transparent; }
        .review-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 20px; }
        .review-scroll::-webkit-scrollbar-thumb:hover { background: rgba(129,140,248,0.3); }
      `}} />
    </div>
  );
}
