"use client";
import BoardLazy from "@/components/board/BoardLazy";
import { useEffect, useState } from "react";
import type { FocusId } from "@/components/board/BoardCanvas";

export default function Dev() {
  const [focus, setFocus] = useState<FocusId>("overview");
  const [opts, setOpts] = useState({ xray: false, exploded: false });
  useEffect(() => {
    const h = new URLSearchParams(location.search);
    setFocus((h.get("f") as FocusId) ?? "overview");
    setOpts({ xray: h.has("xray"), exploded: h.has("exploded") });
  }, []);
  return <div style={{ width: "100vw", height: "100vh" }}><BoardLazy mode="explorer" focus={focus} onSelect={setFocus} {...opts} /></div>;
}
