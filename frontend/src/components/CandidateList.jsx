import { useState } from "react";

const STATUS_META = {
  pending: { label: "Pending", className: "badge--pending" },
  processed: { label: "Processed", className: "badge--processed" },
  failed: { label: "Failed", className: "badge--failed" },
};

const STATUS_ORDER = { processed: 0, pending: 1, failed: 2 };

function CandidateList({ candidates, selectedIds, onToggleSelect }) {
  const [expandedId, setExpandedId] = useState(null);

  if (candidates.length === 0) {
    return <p className="muted">No resumes uploaded yet for this job.</p>;
  }

  const sorted = [...candidates].sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    return (b.finalScore || 0) - (a.finalScore || 0);
  });

  return (
    <div className="candidate-list">
      {sorted.map((c) => {
        const meta = STATUS_META[c.status] || STATUS_META.pending;
        const expanded = expandedId === c._id;
        return (
          <div key={c._id} className={`candidate-row ${c.excluded ? "candidate-row--excluded" : ""}`}>
            <div className="candidate-row-main">
              {c.status === "processed" && (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c._id)}
                  onChange={() => onToggleSelect(c._id)}
                  aria-label={`Select ${c.name || c.fileName}`}
                />
              )}
              <div className="candidate-identity" onClick={() => setExpandedId(expanded ? null : c._id)}>
                <strong>{c.name || c.fileName}</strong>
                {c.email && <span className="muted"> · {c.email}</span>}
              </div>
              <span className={`badge ${meta.className}`}>{meta.label}</span>
              {c.status === "processed" && <span className="candidate-score">{Math.round(c.finalScore)}</span>}
              <button
                type="button"
                className="btn-ghost small"
                onClick={() => setExpandedId(expanded ? null : c._id)}
              >
                {expanded ? "Hide" : "Details"}
              </button>
            </div>

            {c.status === "failed" && (
              <p className="candidate-error">{c.processingError || "Could not process this file."}</p>
            )}

            {expanded && c.status === "processed" && (
              <div className="candidate-details">
                <p>{c.summary}</p>

                <div className="score-grid">
                  <div>Skill match: {Math.round(c.subScores?.skillMatch || 0)}</div>
                  <div>Experience: {Math.round(c.subScores?.experience || 0)}</div>
                  <div>Expertise: {Math.round(c.subScores?.expertise || 0)}</div>
                  <div>Qualification: {Math.round(c.subScores?.qualification || 0)}</div>
                </div>

                {c.whyChoose && (
                  <p>
                    <strong>Why consider:</strong> {c.whyChoose}
                  </p>
                )}

                {c.lacking?.length > 0 && (
                  <p>
                    <strong>Gaps:</strong> {c.lacking.join(", ")}
                  </p>
                )}

                {c.matchedSkills?.length > 0 && (
                  <p>
                    <strong>Matched skills:</strong> {c.matchedSkills.join(", ")}
                  </p>
                )}

                {c.additionalSkills?.length > 0 && (
                  <p>
                    <strong>Additional skills:</strong> {c.additionalSkills.join(", ")}
                  </p>
                )}

                {c.greenFlags?.length > 0 && (
                  <p className="flags flags--green">
                    <strong>Green flags:</strong> {c.greenFlags.join(", ")}
                  </p>
                )}

                {c.redFlags?.length > 0 && (
                  <p className="flags flags--red">
                    <strong>Red flags:</strong> {c.redFlags.join(", ")}
                  </p>
                )}

                <p className="muted small">
                  {c.experienceYears ?? "?"} yrs experience · {c.qualification || "qualification not detected"}
                  {c.phone && ` · ${c.phone}`}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CandidateList;
