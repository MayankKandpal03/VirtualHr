import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi, getErrorMessage } from "../api/client";

const emptyJob = {
  title: "",
  description: "",
  requiredSkills: "",
  experienceMin: "",
  experienceMax: "",
  qualification: "",
  otherRequirements: "",
  totalCandidatesNeeded: 10,
  priorityScore: 50,
};

const STATUS_LABEL = {
  draft: "No resumes yet",
  processing: "Processing…",
  completed: "Completed",
  failed: "Processing failed",
};

function JobsPage({ onSelectJob }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyJob);
  const [formError, setFormError] = useState("");

  const {
    data: jobs,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["jobs"],
    queryFn: jobsApi.list,
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === "processing") ? 6000 : false,
  });

  const createJob = useMutation({
    mutationFn: (payload) => jobsApi.create(payload),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setShowForm(false);
      setForm(emptyJob);
      onSelectJob(job._id);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    createJob.mutate({
      ...form,
      requiredSkills: form.requiredSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      experienceMin: form.experienceMin === "" ? undefined : Number(form.experienceMin),
      experienceMax: form.experienceMax === "" ? undefined : Number(form.experienceMax),
      totalCandidatesNeeded: Number(form.totalCandidatesNeeded) || 10,
      priorityScore: Number(form.priorityScore),
    });
  };

  return (
    <div className="jobs-page">
      <div className="jobs-header">
        <h1>Your job openings</h1>
        <button type="button" className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New job"}
        </button>
      </div>

      {showForm && (
        <form className="job-form" onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">{formError}</div>}

          <label>
            Job title
            <input
              required
              value={form.title}
              onChange={handleChange("title")}
              placeholder="Senior Backend Engineer"
            />
          </label>

          <label>
            Job description
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={handleChange("description")}
              placeholder="Paste the full job description here…"
            />
          </label>

          <label>
            Required skills (comma separated)
            <input
              value={form.requiredSkills}
              onChange={handleChange("requiredSkills")}
              placeholder="Node.js, MongoDB, React"
            />
          </label>

          <div className="form-row">
            <label>
              Min. experience (years)
              <input type="number" min="0" value={form.experienceMin} onChange={handleChange("experienceMin")} />
            </label>
            <label>
              Max. experience (years)
              <input type="number" min="0" value={form.experienceMax} onChange={handleChange("experienceMax")} />
            </label>
          </div>

          <label>
            Qualification
            <input
              value={form.qualification}
              onChange={handleChange("qualification")}
              placeholder="B.Tech / B.E. in CS or related"
            />
          </label>

          <label>
            Other requirements
            <textarea rows={2} value={form.otherRequirements} onChange={handleChange("otherRequirements")} />
          </label>

          <div className="form-row">
            <label>
              Candidates to shortlist
              <input
                type="number"
                min="1"
                value={form.totalCandidatesNeeded}
                onChange={handleChange("totalCandidatesNeeded")}
              />
            </label>
            <label>
              Prioritize: experience ↔ expertise
              <input type="range" min="0" max="100" value={form.priorityScore} onChange={handleChange("priorityScore")} />
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={createJob.isPending}>
            {createJob.isPending ? "Creating…" : "Create job"}
          </button>
        </form>
      )}

      {isLoading && <p className="muted">Loading jobs…</p>}
      {isError && <div className="alert alert-error">{getErrorMessage(error)}</div>}

      {!isLoading && jobs?.length === 0 && (
        <p className="muted">No jobs yet — create one to start shortlisting candidates.</p>
      )}

      <div className="job-grid">
        {jobs?.map((job) => (
          <button key={job._id} type="button" className="job-card" onClick={() => onSelectJob(job._id)}>
            <div className={`job-status job-status--${job.status}`}>{STATUS_LABEL[job.status] || job.status}</div>
            <h3>{job.title}</h3>
            <p className="job-card-meta">
              {job.totalResumesProcessed}/{job.totalResumesUploaded} resumes processed
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default JobsPage;
