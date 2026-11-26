import '../styles/portal.css';

export default function BootScreen({ waking }: { waking?: boolean }) {
  return (
    <div className="boot-screen">
      <div className="portal-brand boot-brand"><span>the</span>e<span>insurance</span></div>
      <span className="ui-spinner large" aria-hidden="true" />
      <p>{waking ? 'Waking the server up. The first request after a quiet spell can take about a minute.' : 'Loading your workspace…'}</p>
    </div>
  );
}
