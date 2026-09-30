import { IconAnimation } from '@/components/brand/icon-animation';
export default function Loading() {
  return (
    <main
      id="main"
      className="learning-workspace"
      style={{
        display: 'grid',
        placeContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
      }}
    >
      <div style={{ width: 150, margin: 'auto' }}>
        <IconAnimation variant="loading" label="Loading your workspace" />
      </div>
      <p>Loading your workspace…</p>
    </main>
  );
}
