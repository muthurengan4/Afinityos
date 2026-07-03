'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Send, Loader2, Plus, MessageSquare, Trash2, Pencil, Check, X,
  Bot, User as UserIcon, TrendingUp, Headphones, Megaphone, Gift, Shield, Activity, Cable, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SUGGESTIONS = [
  { icon: Activity,   text: 'Give me a full status of the business right now.' },
  { icon: TrendingUp, text: 'What are our top 5 open sales opportunities and where do they stand?' },
  { icon: Headphones, text: 'Are there any SLA-breached support tickets I should worry about?' },
  { icon: Megaphone,  text: 'How did our marketing campaigns perform over the last 30 days?' },
  { icon: Gift,       text: 'Who are our top loyalty redeemers and how many points are outstanding?' },
  { icon: Shield,     text: 'Give me a summary of the insurance book and any recent claims.' },
  { icon: Users,      text: 'Show me at-risk customers I should personally reach out to.' },
  { icon: Cable,      text: 'Which external connectors are live and which are still in mock mode?' },
];

const TOOL_LABELS = {
  get_org_snapshot: 'Org snapshot',
  search_customers: 'Customer search',
  get_customer_360: 'Customer 360',
  get_sales_pipeline: 'Sales pipeline',
  get_support_summary: 'Support summary',
  get_marketing_summary: 'Marketing summary',
  get_rewards_summary: 'Rewards summary',
  get_insurance_summary: 'Insurance summary',
  get_recent_events: 'Recent events',
  get_connector_status: 'Connector status',
};

export default function AskPage() {
  const { authFetch, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [renameFor, setRenameFor] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const scrollRef = useRef(null);

  const allowed = ['super_admin', 'org_admin', 'executive'].includes(user?.role);

  const loadSessions = async () => {
    setLoadingList(true);
    try {
      const res = await authFetch('/api/ask/sessions');
      if (!res.ok) throw new Error('Failed to load chats');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingList(false); }
  };

  const loadSession = async (id) => {
    setActiveId(id);
    setMessages([]);
    try {
      const res = await authFetch(`/api/ask/sessions/${id}`);
      if (!res.ok) throw new Error('Failed to open chat');
      const data = await res.json();
      setMessages(data.session.messages || []);
    } catch (e) { toast.error(e.message); }
  };

  const newChat = async () => {
    try {
      const res = await authFetch('/api/ask/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start chat');
      await loadSessions();
      setActiveId(data.session.id);
      setMessages([]);
      setInput('');
    } catch (e) { toast.error(e.message); }
  };

  const deleteChat = async (id, e) => {
    e?.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      const res = await authFetch(`/api/ask/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      if (activeId === id) { setActiveId(null); setMessages([]); }
      loadSessions();
    } catch (e) { toast.error(e.message); }
  };

  const renameChat = async (id) => {
    try {
      const res = await authFetch(`/api/ask/sessions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: renameVal }) });
      if (!res.ok) throw new Error('Failed to rename');
      setRenameFor(null);
      loadSessions();
    } catch (e) { toast.error(e.message); }
  };

  const send = async (text) => {
    const message = (text || input).trim();
    if (!message || sending) return;
    let sessionId = activeId;
    if (!sessionId) {
      // Auto-create a session if user hits send without one
      const res = await authFetch('/api/ask/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'Failed to start chat');
      sessionId = data.session.id;
      setActiveId(sessionId);
      await loadSessions();
    }
    // Optimistic append
    setMessages((prev) => [...prev, { role: 'user', content: message, ts: new Date().toISOString() }]);
    setInput('');
    setSending(true);
    try {
      const res = await authFetch(`/api/ask/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.assistant, toolTrace: data.toolTrace, ts: new Date().toISOString() }]);
      loadSessions();
    } catch (e) {
      toast.error(e.message);
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${e.message}`, ts: new Date().toISOString(), error: true }]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => { if (allowed) loadSessions(); /* eslint-disable-next-line */ }, [allowed]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, sending]);

  if (!allowed) {
    return (
      <div className="max-w-xl mx-auto mt-24">
        <Card className="glass p-8 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
          <h2 className="text-xl font-semibold mb-1">AfinityAI is admin-only</h2>
          <p className="text-sm text-muted-foreground">Ask your Org Admin to give you the <code>executive</code> or <code>org_admin</code> role to access the Business Brain.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 md:left-64 top-16 md:top-16 flex bg-background z-10">
      {/* Chat sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-card/40">
        <div className="p-3 border-b">
          <Button onClick={newChat} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg">
            <Plus className="h-4 w-4 mr-2" /> New chat
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          {loadingList ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 px-3">No chats yet. Start one!</p>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition ${activeId === s.id ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted/60'}`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {renameFor === s.id ? (
                    <>
                      <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} className="h-6 text-xs flex-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') renameChat(s.id); }} />
                      <button onClick={(e) => { e.stopPropagation(); renameChat(s.id); }} className="text-emerald-500 hover:text-emerald-400"><Check className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setRenameFor(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs truncate flex-1">{s.title}</p>
                      <button onClick={(e) => { e.stopPropagation(); setRenameFor(s.id); setRenameVal(s.title); }} className="hidden group-hover:block text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                      <button onClick={(e) => deleteChat(s.id, e)} className="hidden group-hover:block text-muted-foreground hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Main pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b px-6 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-semibold leading-tight">AfinityAI</h1>
            <p className="text-[11px] text-muted-foreground">Your executive business brain • grounded in AfinityOS data</p>
          </div>
          <Badge variant="outline" className="ml-auto text-[10px]">GPT-5 • read-only</Badge>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 px-6 py-6">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-2xl shadow-primary/30 mb-4">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2">What do you want to know about your business today?</h2>
                <p className="text-sm text-muted-foreground">AfinityAI has read-only access to your customers, deals, tickets, campaigns, rewards, policies, events, and connectors — all scoped to your organization.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      onClick={() => send(s.text)}
                      className="text-left p-4 rounded-xl border bg-card/40 hover:border-primary/40 hover:bg-primary/5 transition flex items-start gap-3"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                      <span className="text-sm">{s.text}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m, i) => <MessageBubble key={i} m={m} user={user} />)}
              {sending && (
                <div className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shrink-0"><Sparkles className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="text-xs text-muted-foreground mb-1">AfinityAI</div>
                    <div className="flex gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" /><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" /></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Composer */}
        <div className="border-t bg-background/80 backdrop-blur px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl border bg-card/40 focus-within:border-primary/40 transition">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about sales, marketing, support, rewards, insurance, customers…"
                rows={1}
                className="border-0 bg-transparent resize-none pr-12 focus-visible:ring-0 min-h-[52px] max-h-40 py-4"
                disabled={sending}
              />
              <Button
                onClick={() => send()}
                disabled={sending || !input.trim()}
                size="icon"
                className="absolute right-2 bottom-2 h-9 w-9 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">AfinityAI can call read-only tools against your organization&apos;s data. It never modifies records.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m, user }) {
  const isUser = m.role === 'user';
  const initials = (user?.name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-start">
      {isUser ? (
        <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-500 text-white"><AvatarFallback className="bg-transparent text-white text-xs">{initials}</AvatarFallback></Avatar>
      ) : (
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shrink-0"><Sparkles className="h-4 w-4" /></div>
      )}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="text-xs text-muted-foreground mb-1">{isUser ? (user?.name || 'You') : 'AfinityAI'}</div>
        {m.toolTrace && m.toolTrace.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {m.toolTrace.map((t, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-mono bg-primary/5 border-primary/20">
                <Bot className="h-2.5 w-2.5 mr-1" /> {TOOL_LABELS[t.name] || t.name}
              </Badge>
            ))}
          </div>
        )}
        <div className={`prose prose-sm dark:prose-invert max-w-none ${m.error ? 'text-rose-400' : ''}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap m-0">{m.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || ''}</ReactMarkdown>
          )}
        </div>
      </div>
    </motion.div>
  );
}
