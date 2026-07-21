import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { candidatesApi, getErrorMessage } from "../api/client";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.zip";

function UploadPanel({ jobId }) {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: () =>
      candidatesApi.upload(jobId, files, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
      }),
    onSuccess: (result) => {
      setLastResult({ ok: true, ...result });
      setFiles([]);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["candidates", jobId, "all"] });
    },
    onError: (err) => {
      setLastResult({ ok: false, message: getErrorMessage(err) });
      setProgress(0);
    },
  });

  const addFiles = (fileList) => {
    setLastResult(null);
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="upload-panel">
      <div
        className={`dropzone ${dragOver ? "dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <p>Drag &amp; drop resumes or a .zip here, or click to browse</p>
        <p className="muted small">PDF, PNG, JPG, or a .zip of those — up to 50 files, 8MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="file-pill-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="file-pill">
              {f.name}
              <button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <button
          type="button"
          className="btn-primary"
          disabled={uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
        >
          {uploadMutation.isPending ? `Uploading… ${progress}%` : `Upload ${files.length} file(s)`}
        </button>
      )}

      {lastResult && lastResult.ok && (
        <div className="alert alert-success">
          {lastResult.accepted} file(s) accepted and queued for analysis.
          {lastResult.rejected?.length > 0 && (
            <> {lastResult.rejected.length} file(s) were skipped: {lastResult.rejected.map((r) => r.name).join(", ")}.</>
          )}
        </div>
      )}
      {lastResult && !lastResult.ok && <div className="alert alert-error">{lastResult.message}</div>}
    </div>
  );
}

export default UploadPanel;
