'use client';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FolderOpen, Search } from 'lucide-react';
import { studentLessons } from '@/lib/workspace';
import { lessonDate } from '@/lib/lessons';
import { Empty, FileRow, Title, useStudio } from './ui';

export function FilesView() {
  const { data, studentId, href } = useStudio();
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('all');
  const files = data.files.filter(
    (f) =>
      f.student_id === studentId &&
      f.kind === 'submission' &&
      f.file_name.toLowerCase().includes(search.toLowerCase()) &&
      (fileType === 'all' || f.file_name.toLowerCase().endsWith('.py')),
  );
  const lessons = studentLessons(data, studentId).sort((a, b) =>
    b.starts_at.localeCompare(a.starts_at),
  );
  return (
    <>
      <Title title="Files">Upload your work from each class page.</Title>
      <div className="ws-library-toolbar">
        <label className="ws-search">
          <Search size={19} />
          <input
            aria-label="Search files"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a file…"
          />
        </label>
        <select
          aria-label="File type"
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
        >
          <option value="all">All files</option>
          <option value="python">Python files</option>
        </select>
      </div>
      {!lessons.length ? (
        <Empty title="No classes yet">
          Your files will show here, grouped by class.
        </Empty>
      ) : (
        lessons
          .filter(
            (l) =>
              (!search && fileType === 'all') ||
              files.some((f) => f.lesson_id === l.id),
          )
          .map((l) => (
            <section className="ws-panel ws-file-folder" key={l.id}>
              <div className="ws-section-heading">
                <div className="ws-folder-heading">
                  <FolderOpen size={25} />
                  <div>
                    <h2>{l.title}</h2>
                    <small>{lessonDate(l.starts_at)}</small>
                  </div>
                </div>
                <Link className="ws-text-link" href={href(`calendar/${l.id}`)}>
                  Open class <ArrowUpRight size={16} />
                </Link>
              </div>
              {files
                .filter((f) => f.lesson_id === l.id)
                .map((f) => (
                  <FileRow key={f.id} file={f} />
                ))}
              {!files.some((f) => f.lesson_id === l.id) && (
                <p className="ws-muted">No files saved for this class yet.</p>
              )}
            </section>
          ))
      )}
      {lessons.length > 0 &&
        (search || fileType !== 'all') &&
        !files.length && (
          <Empty title="No matching files">
            Try another filename or file type.
          </Empty>
        )}
    </>
  );
}
export function PractiseView() {
  return (
    <>
      <Title title="Practise" />
      <section className="ws-practise">
        <Image
          unoptimized
          src="/brand/codelah-robot-static.svg"
          width="150"
          height="150"
          alt=""
        />
        <h2>Coming soon</h2>
        <p>Practice exercises and quizzes will be here.</p>
        <PractiseLink />
      </section>
    </>
  );
}
function PractiseLink() {
  const { href } = useStudio();
  return (
    <Link className="ws-button" href={href('worksheets')}>
      Go to worksheets <ArrowUpRight size={18} />
    </Link>
  );
}
