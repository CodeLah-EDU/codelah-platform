'use client';
import { useEffect, useRef, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';

type JoinResponse = { roomUrl?: string; token?: string; error?: string };

export function DailyClassroom({ lessonId }: { lessonId: string }) {
  const container = useRef<HTMLDivElement>(null);
  const call = useRef<DailyCall | null>(null);
  const [state, setState] = useState<'ready' | 'joining' | 'joined'>('ready');
  const [error, setError] = useState('');

  useEffect(
    () => () => {
      call.current?.destroy();
      call.current = null;
    },
    [],
  );

  async function join() {
    if (!container.current || state !== 'ready') return;
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
        instance.destroy();
        call.current = null;
        setState('ready');
      });
      await instance.join({ url: result.roomUrl, token: result.token });
      setState('joined');
    } catch (problem) {
      call.current?.destroy();
      call.current = null;
      setState('ready');
      setError(
        problem instanceof Error
          ? problem.message
          : 'The classroom could not be opened.',
      );
    }
  }

  return (
    <section className="classroom-stage" aria-label="Live classroom">
      {state !== 'joined' && (
        <div className="classroom-entry">
          <p>
            Check your camera and microphone in Daily’s pre-join screen before
            entering.
          </p>
          <button
            className="button primary"
            onClick={join}
            disabled={state === 'joining'}
          >
            {state === 'joining'
              ? 'Opening classroom…'
              : 'Check devices and join'}
          </button>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      <div
        ref={container}
        className={state === 'joined' ? 'daily-frame' : 'daily-frame empty'}
      />
    </section>
  );
}
