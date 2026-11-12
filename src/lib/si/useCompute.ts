"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkerRequest } from "./worker";

type Req = WorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, "id"> : never) : never;

let worker: Worker | null = null;
let workerFailed = false;
let seq = 0;
const listeners = new Map<number, (ok: boolean, data: unknown) => void>();

function getWorker(): Worker | null {
  if (workerFailed || typeof window === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const cb = listeners.get(e.data.id);
      listeners.delete(e.data.id);
      cb?.(e.data.ok, e.data.ok ? e.data.result : e.data.error);
    };
    worker.onerror = () => { workerFailed = true; worker = null; };
  } catch {
    workerFailed = true;
    worker = null;
  }
  return worker;
}

async function run(req: Req): Promise<unknown> {
  const id = ++seq;
  const w = getWorker();
  if (!w) {
    const { compute } = await import("./worker");
    return compute({ ...req, id } as WorkerRequest).result;
  }
  return new Promise((resolve, reject) => {
    listeners.set(id, (ok, data) => (ok ? resolve(data) : reject(new Error(String(data)))));
    w.postMessage({ ...req, id });
  });
}

/**
 * Runs a simulation off the main thread. Only one request per hook is in
 * flight; while it runs, newer inputs replace the pending one (latest wins).
 */
export function useCompute<T>(req: Req | null, key: string): { data: T | null; busy: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);
  const pending = useRef<Req | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!req) return;
    pending.current = req;
    const pump = () => {
      if (inflight.current || !pending.current) return;
      const next = pending.current;
      pending.current = null;
      inflight.current = true;
      setBusy(true);
      run(next)
        .then((r) => { if (alive.current) setData(r as T); })
        .catch((e) => console.error(e))
        .finally(() => {
          inflight.current = false;
          if (alive.current) {
            if (pending.current) pump();
            else setBusy(false);
          }
        });
    };
    pump();
    // `key` is a stable serialization of req
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, busy };
}
