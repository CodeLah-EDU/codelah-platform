'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Plus, Users } from 'lucide-react';
import { shortDate } from '@/lib/admin-workspace';
import { LessonEditor } from './lesson-editor';
import {
  useAdmin,
  useAdminReady,
  Action,
  Avatar,
  Badge,
  Empty,
  Field,
  Form,
  Heading,
  Modal,
  SearchBox,
} from './console-ui';

function ClassForm({ id, close }: { id?: string; close?: () => void }) {
  const { data, href } = useAdmin();
  const router = useRouter();
  const classroom = data.classes.find((c) => c.id === id);
  return (
    <Form
      action="class_save"
      values={id ? { id } : {}}
      label={id ? 'Save class' : 'Create class'}
      onSaved={(saved) => {
        if (close) close();
        else router.push(href(`classes/${saved}`));
      }}
    >
      <Field label="Class name">
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={classroom?.name}
          placeholder="e.g. Python explorers · Saturday"
        />
      </Field>
      <Field label="Class status">
        <select
          name="active"
          defaultValue={classroom?.active === false ? 'false' : 'true'}
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
        </select>
      </Field>
      <p className="ops-form-note">
        Each class has up to four students. Archiving preserves its records; it
        does not cancel scheduled lessons.
      </p>
    </Form>
  );
}
export function ClassDirectory() {
  const { data, href } = useAdmin();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const ready = useAdminReady();
  const classes = data.classes.filter(
    (c) =>
      (status === 'all' || c.active === (status === 'active')) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Classes"
        action={
          <Link className="ops-button" href={href('classes/new')}>
            <Plus size={18} />
            Create class
          </Link>
        }
      >
        Small groups, clear rosters, and the right teacher for every class.
      </Heading>
      <section className="ops-panel">
        <div className="ops-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            label="Search classes"
            placeholder="Find a class…"
          />
          <select
            aria-label="Class status filter"
            value={status}
            disabled={!ready}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active classes</option>
            <option value="archived">Archived classes</option>
            <option value="all">All classes</option>
          </select>
          <span className="ops-result-count">{classes.length} classes</span>
        </div>
        {!classes.length ? (
          <Empty title="No classes found">
            Create a class or adjust your filters.
          </Empty>
        ) : (
          <div className="ops-class-cards">
            {classes.map((c) => {
              const roster = data.enrolments.filter(
                (e) => e.classroom_id === c.id && e.active,
              );
              const teachers = data.assignments
                .filter((a) => a.classroom_id === c.id && a.active)
                .map(
                  (a) =>
                    data.people.find((p) => p.id === a.teacher_id)
                      ?.display_name,
                );
              return (
                <article className="ops-class-card" key={c.id}>
                  <div className="ops-class-top">
                    <span className="ops-class-icon">
                      <BookOpen size={24} />
                    </span>
                    <Badge value={c.active ? 'active' : 'archived'} />
                  </div>
                  <h2>
                    <Link href={href(`classes/${c.id}`)}>{c.name}</Link>
                  </h2>
                  <p>{teachers.join(', ') || 'Teacher not assigned'}</p>
                  <div className="ops-capacity">
                    <div>
                      {Array.from({ length: 4 }, (_, i) => (
                        <span
                          key={i}
                          className={i < roster.length ? 'filled' : ''}
                        />
                      ))}
                    </div>
                    <span>{roster.length} / 4 students</span>
                  </div>
                  <div className="ops-class-bottom">
                    <span>{4 - roster.length} places available</span>
                    <Link
                      className="ops-text-link"
                      href={href(`classes/${c.id}`)}
                    >
                      Manage
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
export function NewClass() {
  const { href } = useAdmin();
  return (
    <>
      <Link className="ops-back" href={href('classes')}>
        <ArrowLeft size={16} />
        Classes
      </Link>
      <Heading title="Create a class">
        Start with a name, then connect students and teachers.
      </Heading>
      <section className="ops-panel ops-form-panel">
        <ClassForm />
      </section>
    </>
  );
}
export function ClassRecord({ id }: { id: string }) {
  const { data, href } = useAdmin();
  const classroom = data.classes.find((c) => c.id === id);
  if (!classroom)
    return (
      <Empty title="Class unavailable">
        Return to the class directory and refresh.
      </Empty>
    );
  const roster = data.enrolments.filter(
    (e) => e.classroom_id === id && e.active,
  );
  const teachers = data.assignments.filter(
    (a) => a.classroom_id === id && a.active,
  );
  const person = (id: string) => data.people.find((p) => p.id === id);
  const available = data.people.filter(
    (p) =>
      p.role === 'student' &&
      p.status === 'active' &&
      !roster.some((e) => e.student_id === p.id),
  );
  const eligibleTeachers = data.people.filter(
    (p) =>
      p.role === 'teacher' &&
      p.status === 'active' &&
      !teachers.some((a) => a.teacher_id === p.id),
  );
  const lessons = data.lessons
    .filter((l) => l.classroom_id === id)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return (
    <>
      <Link className="ops-back" href={href('classes')}>
        <ArrowLeft size={16} />
        Classes
      </Link>
      <Heading
        title={classroom.name}
        action={
          <Modal title="Edit class" trigger="Edit class">
            {(close) => <ClassForm id={id} close={close} />}
          </Modal>
        }
      >
        <span className="ops-inline-badges">
          <Badge value={classroom.active ? 'active' : 'archived'} />
          Up to four students per class.
        </span>
      </Heading>
      <div className="ops-record-grid">
        <section className="ops-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Student roster</h2>
              <p>Recurring enrolments for this class.</p>
            </div>
            <span className="ops-count-pill">
              <Users size={16} />
              {roster.length} / 4 places
            </span>
          </div>
          {!roster.length ? (
            <Empty title="No students enrolled yet">
              Choose an active student to fill the first place.
            </Empty>
          ) : (
            <ul className="ops-record-list">
              {roster.map((e) => (
                <li key={e.student_id}>
                  <div className="ops-person">
                    <Avatar
                      name={person(e.student_id)?.display_name ?? 'Student'}
                    />
                    <Link
                      className="ops-record-link"
                      href={href(`accounts/${e.student_id}`)}
                    >
                      {person(e.student_id)?.display_name}
                    </Link>
                  </div>
                  <Action
                    action="enrolment"
                    values={{
                      classroom_id: id,
                      student_id: e.student_id,
                      active: 'false',
                    }}
                    confirm={`End enrolment for ${person(e.student_id)?.display_name}? Existing lesson rosters stay unchanged.`}
                  >
                    End enrolment
                  </Action>
                </li>
              ))}
            </ul>
          )}
          {roster.length >= 4 ? (
            <p className="ops-banner">
              This class is full. All four places are taken.
            </p>
          ) : classroom.active && available.length > 0 ? (
            <div className="ops-panel-inset">
              <Form
                action="enrolment"
                values={{ classroom_id: id, active: 'true' }}
                label="Enrol student"
              >
                <Field label="Add a student">
                  <select name="student_id" required defaultValue="">
                    <option value="">Choose a student</option>
                    {available.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </Form>
            </div>
          ) : null}
          <p className="ops-panel-footnote">
            Changes affect the recurring class. Already scheduled lessons retain
            their own rosters.
          </p>
        </section>
        <section className="ops-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Teachers</h2>
              <p>Teaching access for this class.</p>
            </div>
            <BookOpen size={23} />
          </div>
          {!teachers.length ? (
            <Empty title="No teacher assigned">
              Choose a teacher to give them access to this class.
            </Empty>
          ) : (
            <ul className="ops-record-list">
              {teachers.map((a) => (
                <li key={a.teacher_id}>
                  <Link
                    className="ops-record-link"
                    href={href(`accounts/${a.teacher_id}`)}
                  >
                    {person(a.teacher_id)?.display_name}
                  </Link>
                  <Action
                    action="teacher"
                    values={{
                      classroom_id: id,
                      teacher_id: a.teacher_id,
                      active: 'false',
                    }}
                    confirm={`Remove the class assignment for ${person(a.teacher_id)?.display_name}?`}
                  >
                    Remove assignment
                  </Action>
                </li>
              ))}
            </ul>
          )}
          {classroom.active && eligibleTeachers.length > 0 && (
            <div className="ops-panel-inset">
              <Form
                action="teacher"
                values={{ classroom_id: id, active: 'true' }}
                label="Assign teacher"
              >
                <Field label="Assign a teacher">
                  <select name="teacher_id" required defaultValue="">
                    <option value="">Choose a teacher</option>
                    {eligibleTeachers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </Form>
            </div>
          )}
        </section>
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Lesson registers</h2>
            <p>Attendance is stored separately for every lesson.</p>
          </div>
          <div className="ops-panel-actions">
            <Link
              className="ops-text-link"
              href={href(`attendance?classroom=${id}&from=&to=`)}
            >
              All registers
              <ArrowRight size={16} />
            </Link>
            {classroom.active && (
              <Modal title="Schedule a lesson" trigger="Schedule lesson">
                {(close) => <LessonEditor classroomId={id} close={close} />}
              </Modal>
            )}
          </div>
        </div>
        {!lessons.length ? (
          <Empty title="No lessons scheduled yet">
            Scheduled lessons will appear here.
          </Empty>
        ) : (
          <ul className="ops-record-list">
            {lessons.slice(0, 6).map((l) => (
              <li key={l.id}>
                <div>
                  <Link
                    className="ops-record-link"
                    href={href(`attendance/${l.id}`)}
                  >
                    {l.title}
                  </Link>
                  <span className="ops-cell-note">
                    {shortDate(l.starts_at)}
                  </span>
                </div>
                <Badge value={l.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
