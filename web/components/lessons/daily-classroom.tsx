'use client';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { Maximize2, MessageSquare, Minimize2, Send, X } from 'lucide-react';

type JoinResponse = { roomUrl?: string; token?: string; error?: string };
export type ChatMessage = {
  id: string;
  from: string;
  text: string;
  at: number;
};
type ChatPacket = { type: 'chat'; message: ChatMessage };

export const CHAT_MESSAGE_LIMIT = 1000;
const noSubscription = () => () => {};

// Chat travels as Daily app messages, so it lasts as long as the call and is never stored.
export function readChatPacket(value: unknown): ChatMessage[] {
  const packet = value as ChatPacket | null;
  const list = packet?.type === 'chat' ? [packet.message] : [];
  return list.filter(
    (m): m is ChatMessage =>
      typeof m?.id === 'string' &&
      typeof m.from === 'string' &&
      typeof m.text === 'string' &&
      typeof m.at === 'number' &&
      m.text.length > 0 &&
      m.text.length <= CHAT_MESSAGE_LIMIT,
  );
}

export function addChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
) {
  const known = new Set(current.map((m) => m.id));
  const added = incoming.filter((m) => !known.has(m.id));
  return added.length
    ? [...current, ...added].sort((a, b) => a.at - b.at).slice(-200)
    : current;
}

export function DailyClassroom({
  lessonId,
  teacher,
}: {
  lessonId: string;
  teacher: boolean;
}) {
  const stage = useRef<HTMLElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const call = useRef<DailyCall | null>(null);
  const started = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [state, setState] = useState<'ready' | 'joining' | 'joined'>('ready');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const canFullscreen = useSyncExternalStore(
    noSubscription,
    () => document.fullscreenEnabled,
    () => false,
  );
  const chatOpenRef = useRef(true);

  function receive(incoming: ChatMessage[]) {
    const next = addChatMessages(messagesRef.current, incoming);
    if (next === messagesRef.current) return;
    if (!chatOpenRef.current)
      setUnread((n) => n + next.length - messagesRef.current.length);
    messagesRef.current = next;
    setMessages(next);
  }

  async function join() {
    if (!container.current || call.current) return;
    setState('joining');
    setError('');
    try {
      const form = new FormData();
      form.set('lesson_id', lessonId);
      const response = await fetch('/dashboard/lessons/classroom/join', {
        method: 'POST',
        body: form,
      });
      const result = (await response.json()) as JoinResponse;
      if (!response.ok || !result.roomUrl || !result.token)
        throw new Error(result.error || 'The classroom could not be opened.');
      const { default: Daily } = await import('@daily-co/daily-js');
      if (!Daily.supportedBrowser().supported)
        throw new Error('This browser cannot run the classroom.');
      const instance = Daily.createFrame(container.current, {
        showLeaveButton: true,
        iframeStyle: { width: '100%', height: '100%', border: '0' },
      });
      call.current = instance;
      instance.on('left-meeting', () => {
        void instance.destroy();
        call.current = null;
        setState('ready');
      });
      instance.on('app-message', (event) => {
        // Only the teacher (a room owner) may post; ignore anything else.
        const sender = event?.fromId
          ? instance.participants()[event.fromId]
          : undefined;
        if (sender?.owner) receive(readChatPacket(event?.data));
      });
      instance.on('participant-joined', (event) => {
        const id = event?.participant.session_id;
        // Catch latecomers up one message at a time (Daily caps each packet at 4 KB).
        if (teacher && id)
          for (const message of messagesRef.current.slice(-50))
            instance.sendAppMessage({ type: 'chat', message }, id);
      });
      await instance.join({ url: result.roomUrl, token: result.token });
      setState('joined');
    } catch (problem) {
      void call.current?.destroy();
      call.current = null;
      setState('ready');
      setError(
        problem instanceof Error
          ? problem.message
          : 'The classroom could not be opened.',
      );
    }
  }

  function send(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const field = form.elements.namedItem('message') as HTMLTextAreaElement;
    const text = field.value.trim();
    if (!text || !call.current) return;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      from: call.current.participants().local?.user_name || 'Teacher',
      text: text.slice(0, CHAT_MESSAGE_LIMIT),
      at: Date.now(),
    };
    call.current.sendAppMessage({ type: 'chat', message }, '*');
    receive([message]);
    form.reset();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen();
  }

  function toggleChat() {
    chatOpenRef.current = !chatOpen;
    setChatOpen(!chatOpen);
    setUnread(0);
  }

  const startJoin = useEffectEvent(() => void join());
  useEffect(() => {
    const change = () =>
      setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  useEffect(() => {
    // Open the call straight away; the guard stops a second join in development.
    if (!started.current) {
      started.current = true;
      startJoin();
    }
    return () => {
      void call.current?.destroy();
      call.current = null;
    };
  }, []);

  const joined = state === 'joined';
  return (
    <section
      ref={stage}
      className={`classroom-stage${fullscreen ? ' is-fullscreen' : ''}`}
      aria-label="Live classroom"
    >
      {!joined && (
        <div className="classroom-entry">
          {state === 'joining' ? (
            <p>
              Opening the classroom… Check your camera and microphone, then
              press Join.
            </p>
          ) : (
            <button className="button primary" onClick={join}>
              {error ? 'Try again' : 'Join classroom'}
            </button>
          )}
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      {joined && (
        <div className="classroom-toolbar">
          <button type="button" className="button" onClick={toggleChat}>
            <MessageSquare size={17} />
            {chatOpen ? 'Hide chat' : 'Show chat'}
            {!chatOpen && unread > 0 && (
              <span className="classroom-unread">{unread}</span>
            )}
          </button>
          {canFullscreen && (
            <button type="button" className="button" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              {fullscreen ? 'Exit full screen' : 'Full screen'}
            </button>
          )}
        </div>
      )}
      <div
        className={`classroom-call${joined && chatOpen ? ' with-chat' : ''}`}
      >
        <div
          ref={container}
          // Visible while joining too: Daily's pre-join device check renders inside it.
          className={state === 'ready' ? 'daily-frame empty' : 'daily-frame'}
        />
        {joined && chatOpen && (
          <aside className="classroom-chat" aria-label="Class chat">
            <header>
              <h2>Class chat</h2>
              <button type="button" aria-label="Hide chat" onClick={toggleChat}>
                <X size={18} />
              </button>
            </header>
            <ol aria-live="polite">
              {messages.length ? (
                messages.map((m) => (
                  <li key={m.id}>
                    <small>
                      {m.from} ·{' '}
                      {new Date(m.at).toLocaleTimeString('en-SG', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </small>
                    <p>{m.text}</p>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(m.text)}
                    >
                      Copy
                    </button>
                  </li>
                ))
              ) : (
                <li className="classroom-chat-empty">
                  {teacher
                    ? 'Share instructions, links or code with the class.'
                    : 'Messages from your teacher will appear here.'}
                </li>
              )}
            </ol>
            {teacher && (
              <form onSubmit={send}>
                <label htmlFor="classroom-message" className="sr-only">
                  Message to the class
                </label>
                <textarea
                  id="classroom-message"
                  name="message"
                  rows={3}
                  maxLength={CHAT_MESSAGE_LIMIT}
                  placeholder="Message the class"
                  required
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button type="submit" className="button primary">
                  <Send size={16} /> Send
                </button>
              </form>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
