import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

// Subscribes to live per-candidate updates for one job. This is a nice-to-have —
// JobDetailPage also polls while a job is processing, so a dropped socket
// connection just means slightly slower updates, never a stuck screen.
export function useJobSocket(jobId, { onEvent } = {}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!jobId || !accessToken) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    socket.emit("job:subscribe", jobId);

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["candidates", jobId, "all"] });
    };

    const handleProcessed = (payload) => {
      refresh();
      onEventRef.current?.({ type: "processed", ...payload });
    };
    const handleFailed = (payload) => {
      refresh();
      onEventRef.current?.({ type: "failed", ...payload });
    };
    const handleCompleted = (payload) => {
      refresh();
      onEventRef.current?.({ type: "completed", ...payload });
    };
    const handleJobFailed = (payload) => {
      refresh();
      onEventRef.current?.({ type: "job-failed", ...payload });
    };

    socket.on("candidate:processed", handleProcessed);
    socket.on("candidate:failed", handleFailed);
    socket.on("job:completed", handleCompleted);
    socket.on("job:failed", handleJobFailed);

    return () => {
      socket.emit("job:unsubscribe", jobId);
      socket.disconnect();
    };
  }, [jobId, accessToken, queryClient]);
}
