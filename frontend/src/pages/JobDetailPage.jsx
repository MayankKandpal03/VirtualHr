import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi, candidatesApi, getErrorMessage } from "../api/client";
import { useJobSocket } from "../hooks/useJobSocket";
import UploadPanel from "../components/UploadPanel";
import ProgressBar from "../components/ProgressBar";
import CandidateList from "../components/CandidateList";
import SendEmailPanel from "../components/SendEmailPanel";

function JobDetailPage({ jobId, onBack }) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [showEmailPanel, setShowEmailPanel] = useState(false);

  const jobQuery = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => jobsApi.getById(jobId),
    refetchInterval: (query) => (query.state.data?.status === "processing" ? 4000 : false),
  });

  const candidatesQuery = useQuery({
    queryKey: ["candidates", jobId, "all"],
    queryFn: () => candidatesApi.listAll(jobId),
    enabled: !!jobId,
    refetchInterval: () => (jobQuery.data?.status === "processing" ? 4000 : false),
  });

  // Live push updates on top of the polling above — whichever arrives first wins,
  // both just invalidate the same query keys.
  useJobSocket(jobId);

  const job = jobQuery.data;
  const candidates = candidatesQuery.data || [];

  const counts = {
    processed: candidates.filter((c) => c.status === "processed").length,
    failed: candidates.filter((c) => c.status === "failed").length,
    pending: candidates.filter((c) => c.status === "pending").length,
    total: candidates.length,
  };

  const updateWeights = useMutation({
    mutationFn: (priorityScore) => jobsApi.updateScoringWeights(jobId, priorityScore),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["candidates", jobId, "all"] });
    },
  });

  const toggleSelect = (candidateId) =>
    setSelectedIds((ids) =>
      ids.includes(candidateId) ? ids.filter((id) => id !== candidateId) : [...ids, candidateId],
    );

  const processedCandidates = candidates.filter((c) => c.status === "processed");
  const hasResults = processedCandidates.length > 0;
  const isBusy = job?.status === "processing" || counts.pending > 0;

  // Inverse of scoringService.weightsFromSlider, using the "experience" weight
  // (0.4 at slider=0 down to 0.15 at slider=100) to recover the slider position
  // that produced the job's current weights.
  const inferredPriority = job
    ? Math.round(Math.min(1, Math.max(0, (0.4 - job.scoringWeights.experience) / 0.25)) * 100)
    : 50;

  return (
    <div className="job-detail">
      <button type="button" className="btn-link" onClick={onBack}>
        ← All jobs
      </button>

      {jobQuery.isLoading && <p className="muted">Loading job…</p>}
      {jobQuery.isError && <div className="alert alert-error">{getErrorMessage(jobQuery.error)}</div>}

      {job && (
        <>
          <div className="job-detail-header">
            <div>
              <h1>{job.title}</h1>
              <p className="muted">{job.description}</p>
            </div>
            <span className={`job-status job-status--${job.status}`}>{job.status}</span>
          </div>

          {job.status === "failed" && (
            <div className="alert alert-error">
              Processing failed unexpectedly for this batch. You can try uploading the resumes again.
            </div>
          )}

          <section className="panel">
            <h2>Upload resumes</h2>
            <UploadPanel jobId={jobId} />
          </section>

          {(isBusy || counts.total > 0) && (
            <section className="panel">
              <h2>Progress</h2>
              <ProgressBar
                processed={counts.processed + counts.failed}
                failed={counts.failed}
                total={counts.total}
                isBusy={isBusy}
              />
            </section>
          )}

          <section className="panel">
            <div className="panel-header-row">
              <h2>Scoring priority</h2>
            </div>
            <label className="scoring-slider">
              Experience ↔ Expertise/project quality
              <input
                type="range"
                min="0"
                max="100"
                defaultValue={inferredPriority}
                onMouseUp={(e) => updateWeights.mutate(Number(e.target.value))}
                onTouchEnd={(e) => updateWeights.mutate(Number(e.target.value))}
              />
            </label>
            <p className="muted small">Re-ranks already-processed candidates instantly — no re-analysis needed.</p>
          </section>

          <section className="panel">
            <div className="panel-header-row">
              <h2>Candidates {hasResults ? `(${processedCandidates.length})` : ""}</h2>
              {hasResults && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={selectedIds.length === 0}
                  onClick={() => setShowEmailPanel(true)}
                >
                  Email selected ({selectedIds.length})
                </button>
              )}
            </div>

            <CandidateList
              candidates={candidates}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </section>

          {showEmailPanel && (
            <SendEmailPanel
              jobId={jobId}
              candidateIds={selectedIds}
              candidates={candidates}
              onClose={() => setShowEmailPanel(false)}
              onSent={() => {
                setShowEmailPanel(false);
                setSelectedIds([]);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default JobDetailPage;
