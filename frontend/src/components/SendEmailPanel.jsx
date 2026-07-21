import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { emailApi, getErrorMessage } from "../api/client";

const DEFAULT_TEMPLATE = `Hi {{name}},

Thank you for applying. Based on our review of your background against the {{jobTitle}} role, we'd like to move forward with next steps.

Your evaluation score: {{score}}

Best regards`;

function SendEmailPanel({ jobId, candidateIds, candidates, onClose, onSent }) {
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [result, setResult] = useState(null);

  const selectedCandidates = candidates.filter((c) => candidateIds.includes(c._id));
  const withoutEmail = selectedCandidates.filter((c) => !c.email);

  const sendMutation = useMutation({
    mutationFn: () => emailApi.sendBulk(jobId, { candidateIds, subject, template }),
    onSuccess: (data) => setResult({ ok: true, ...data }),
    onError: (err) => setResult({ ok: false, message: getErrorMessage(err) }),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Email {candidateIds.length} candidate(s)</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {withoutEmail.length > 0 && (
          <div className="alert alert-warning">
            {withoutEmail.length} selected candidate(s) have no email on file and will be skipped.
          </div>
        )}

        {result?.ok ? (
          <div className="alert alert-success">
            Sent {result.sent}, failed {result.failed}, skipped {result.skippedNoEmail} (no email on file).
            <button type="button" className="btn-primary" onClick={onSent}>
              Done
            </button>
          </div>
        ) : (
          <>
            {result && !result.ok && <div className="alert alert-error">{result.message}</div>}

            <label>
              Subject
              <input required value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>

            <label>
              Message
              <textarea rows={10} required value={template} onChange={(e) => setTemplate(e.target.value)} />
            </label>
            <p className="muted small">
              Placeholders: {"{{name}}"}, {"{{jobTitle}}"}, {"{{score}}"}
            </p>

            <button
              type="button"
              className="btn-primary"
              disabled={sendMutation.isPending || !subject || !template}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending ? "Sending…" : "Send email"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default SendEmailPanel;
