"use client";

import dynamic from "next/dynamic";
import type { BoardCanvasProps } from "./BoardCanvas";

const BoardCanvas = dynamic(() => import("./BoardCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/4 animate-pulse rounded-full bg-[var(--accent)]" />
      </div>
    </div>
  ),
});

export default function BoardLazy(props: BoardCanvasProps) {
  return <BoardCanvas {...props} />;
}
