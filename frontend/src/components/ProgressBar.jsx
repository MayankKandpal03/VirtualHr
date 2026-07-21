function ProgressBar({ processed, failed, total, isBusy }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="progress-block">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-caption">
        <span>
          {processed} of {total} resumes processed
          {failed > 0 && ` (${failed} failed)`}
        </span>
        {isBusy && <span className="progress-live">● Live</span>}
      </div>
    </div>
  );
}

export default ProgressBar;
