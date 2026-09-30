'use client';
import { useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  LockKeyhole,
  FileText,
  Plus,
  SlidersHorizontal,
  UnlockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { type Worksheet, worksheetAvailable } from '@/lib/workspace';
import { LESSON_FILE_ACCEPT, fileSize } from '@/lib/lesson-files';
import {
  useStudio,
  useHydrated,
  Title,
  Empty,
  Tag,
  Modal,
  SaveForm,
  Field,
  Action,
  Download,
} from './ui';

export function WorksheetEditor({
  worksheet,
  close,
}: {
  worksheet?: Worksheet;
  close: () => void;
}) {
  const { data } = useStudio();
  const [course, setCourse] = useState(worksheet?.course_id || '');
  return (
    <SaveForm
      action="worksheet_save"
      values={worksheet ? { id: worksheet.id } : {}}
      onSaved={close}
      label={worksheet ? 'Save worksheet' : 'Upload worksheet'}
    >
      <Field label="Worksheet title">
        <input
          name="title"
          required
          maxLength={160}
          defaultValue={worksheet?.title}
          placeholder="e.g. Robot name lab"
        />
      </Field>
      <Field label="Description">
        <textarea
          name="description"
          maxLength={2000}
          defaultValue={worksheet?.description}
          rows={3}
        />
      </Field>
      <div className="ws-form-grid">
        <Field label="Course">
          <select
            name="course_id"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="">All courses</option>
            {data.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Level">
          <select
            key={course}
            name="level_id"
            defaultValue={
              worksheet?.course_id === course ? worksheet?.level_id || '' : ''
            }
          >
            <option value="">All levels</option>
            {data.levels
              .filter((l) => l.course_id === course)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  Level {l.position} · {l.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <Field label="Tags (separate with commas)">
        <input
          name="tags"
          maxLength={500}
          defaultValue={worksheet?.tags.join(', ')}
          placeholder="variables, strings, beginner"
        />
      </Field>
      <Field label="Who can open this worksheet?">
        <select
          name="visibility"
          defaultValue={worksheet?.visibility || 'locked'}
        >
          <option value="unlocked">Unlocked · all students can open</option>
          <option value="locked">Locked · visible, open when assigned</option>
          <option value="restricted">Restricted · teachers only</option>
        </select>
      </Field>
      <Field
        label={
          worksheet
            ? 'Replace file (optional, up to 10 MB)'
            : 'Worksheet file (up to 10 MB)'
        }
      >
        <input
          type="file"
          name="file"
          accept={LESSON_FILE_ACCEPT}
          required={!worksheet}
        />
      </Field>
    </SaveForm>
  );
}
export function WorksheetLibrary({ assignTo }: { assignTo?: string }) {
  const { data, teacher, studentId } = useStudio();
  const hydrated = useHydrated();
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [level, setLevel] = useState('');
  const [tag, setTag] = useState('');
  const [access, setAccess] = useState('all');
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('name');
  const tags = [...new Set(data.worksheets.flatMap((w) => w.tags))].sort();
  const visible = data.worksheets.filter(
    (w) =>
      (teacher || w.visibility !== 'restricted') &&
      (!assignTo || w.visibility !== 'restricted'),
  );
  const assigned = (w: Worksheet) =>
    data.assignments.some(
      (a) => a.worksheet_id === w.id && a.student_id === assignTo,
    );
  const available = (w: Worksheet) =>
    assignTo
      ? w.visibility === 'unlocked' || assigned(w)
      : worksheetAvailable(data, w, studentId);
  const filtered = visible
    .filter(
      (w) =>
        `${w.title} ${w.description} ${w.tags.join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!course || w.course_id === course) &&
        (!level || w.level_id === level) &&
        (!tag || w.tags.includes(tag)) &&
        (access === 'all' ||
          (access === 'available'
            ? available(w)
            : access === 'locked'
              ? teacher && !assignTo
                ? w.visibility === 'locked'
                : !available(w)
              : w.visibility === access)),
    )
    .sort((a, b) =>
      sort === 'newest'
        ? b.created_at.localeCompare(a.created_at)
        : a.title.localeCompare(b.title),
    );
  return (
    <>
      {!assignTo && (
        <Title
          title="Worksheets"
          action={
            teacher && (
              <Modal
                title="Upload a worksheet"
                trigger={
                  <>
                    <Plus size={19} /> Upload worksheet
                  </>
                }
              >
                {(close) => <WorksheetEditor close={close} />}
              </Modal>
            )
          }
        >
          {teacher
            ? 'One library for every lesson. Upload, organise, and share.'
            : 'Find your next project. Every worksheet is a place to start.'}
        </Title>
      )}
      {!assignTo && (
        <div className="ws-library-intro">
          <span className="ws-folder-icon">
            <FileText size={27} />
          </span>
          <div>
            <h2>Your worksheet library</h2>
            <p>
              {visible.length} worksheets ·{' '}
              {teacher
                ? 'Manage access for your students'
                : 'Open worksheets are yours to explore'}
            </p>
          </div>
          <Tag tone="sage">{data.courses.length} courses</Tag>
        </div>
      )}
      <div className="ws-library-toolbar">
        <label className="ws-search">
          <Search size={19} />
          <input
            aria-label="Search worksheets"
            disabled={!hydrated}
            placeholder="Search worksheets, topics, or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="ws-segment" aria-label="Worksheet layout">
          <button
            aria-label="Grid view"
            disabled={!hydrated}
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
          >
            <LayoutGrid size={19} />
          </button>
          <button
            aria-label="List view"
            disabled={!hydrated}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <List size={20} />
          </button>
        </div>
      </div>
      <div className="ws-filter-bar">
        <SlidersHorizontal size={17} />
        <select
          aria-label="Filter by course"
          disabled={!hydrated}
          value={course}
          onChange={(e) => {
            setCourse(e.target.value);
            setLevel('');
          }}
        >
          <option value="">All courses</option>
          {data.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by level"
          disabled={!hydrated}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">All levels</option>
          {data.levels
            .filter((l) => !course || l.course_id === course)
            .map((l) => (
              <option key={l.id} value={l.id}>
                Level {l.position} · {l.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filter by tag"
          disabled={!hydrated}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Filter by access"
          disabled={!hydrated}
          value={access}
          onChange={(e) => setAccess(e.target.value)}
        >
          <option value="all">Any access</option>
          <option value="available">Available</option>
          <option value="locked">Locked</option>
          {teacher && <option value="restricted">Restricted</option>}
        </select>
        <button
          className="ws-text-button"
          disabled={!hydrated}
          onClick={() => {
            setSearch('');
            setCourse('');
            setLevel('');
            setTag('');
            setAccess('all');
          }}
        >
          Reset
        </button>
      </div>
      <div className="ws-results-line">
        <span>
          {filtered.length} worksheet{filtered.length !== 1 ? 's' : ''}
        </span>
        <label>
          Sort by{' '}
          <select
            aria-label="Sort worksheets"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Name A–Z</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>
      {!filtered.length ? (
        <Empty title="No worksheets found">
          Try another search or adjust your filters.
          {teacher && ' Upload a worksheet to start your library.'}
        </Empty>
      ) : (
        <div
          className={`ws-worksheet-grid ${view === 'list' ? 'as-list' : ''}`}
        >
          {filtered.map((w) => {
            const canOpen = available(w),
              asset = data.assets.find((a) => a.worksheet_id === w.id),
              l = data.levels.find((l) => l.id === w.level_id);
            const label =
              teacher && !assignTo
                ? w.visibility
                : canOpen
                  ? 'Available'
                  : 'Locked';
            return (
              <article key={w.id} className="ws-worksheet">
                <div
                  className={`ws-worksheet-art ${w.visibility === 'restricted' ? 'restricted' : l && l.position > 2 ? 'sage' : ''}`}
                  aria-hidden="true"
                >
                  <FileText size={45} strokeWidth={1.25} />
                  <span>
                    {l
                      ? `LEVEL ${String(l.position).padStart(2, '0')}`
                      : 'WORKSHEET'}
                  </span>
                  {(!canOpen || w.visibility === 'locked') && (
                    <LockKeyhole size={17} className="ws-art-lock" />
                  )}
                </div>
                <div className="ws-worksheet-body">
                  <div className="ws-worksheet-meta">
                    <span>
                      {data.courses.find((c) => c.id === w.course_id)?.name ||
                        'General'}
                    </span>
                    <Tag
                      tone={
                        label === 'Available' || label === 'unlocked'
                          ? 'attended'
                          : ''
                      }
                    >
                      {w.visibility === 'restricted' ? (
                        <ShieldCheck size={12} />
                      ) : canOpen ? (
                        <UnlockKeyhole size={12} />
                      ) : (
                        <LockKeyhole size={12} />
                      )}
                      {label}
                    </Tag>
                  </div>
                  <h3>{w.title}</h3>
                  <p>
                    {w.description || 'A little code. Something new to build.'}
                  </p>
                  <div className="ws-tags">
                    {w.tags.map((t) => (
                      <button key={t} onClick={() => setTag(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="ws-worksheet-footer">
                    <small>
                      {asset
                        ? fileSize(asset.size_bytes)
                        : canOpen
                          ? 'File pending'
                          : 'Unlock with your teacher'}
                    </small>
                    {canOpen && asset ? (
                      <div className="ws-inline-actions">
                        <Download id={w.id} kind="worksheet" open />
                        <Download id={w.id} kind="worksheet" />
                      </div>
                    ) : (
                      !canOpen && (
                        <span className="ws-lock-caption">
                          <LockKeyhole size={14} /> Locked
                        </span>
                      )
                    )}
                  </div>
                  {teacher && (
                    <div className="ws-card-actions">
                      {assignTo ? (
                        w.visibility === 'unlocked' ? (
                          <span className="ws-muted">Open to everyone</span>
                        ) : (
                          <Action
                            className="ws-button secondary"
                            action={
                              assigned(w)
                                ? 'worksheet_revoke'
                                : 'worksheet_unlock'
                            }
                            values={{
                              worksheet_id: w.id,
                              student_id: assignTo,
                            }}
                          >
                            {assigned(w) ? 'Revoke access' : 'Unlock worksheet'}
                          </Action>
                        )
                      ) : (
                        <>
                          <Modal
                            title="Edit worksheet"
                            trigger="Edit"
                            className="ws-text-button"
                          >
                            {(close) => (
                              <WorksheetEditor worksheet={w} close={close} />
                            )}
                          </Modal>
                          <Action
                            action="worksheet_delete"
                            values={{ id: w.id }}
                            confirm={`Delete “${w.title}” and its file for everyone?`}
                          >
                            Delete
                          </Action>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
