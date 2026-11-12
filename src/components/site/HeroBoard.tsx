"use client";

import { useRouter } from "next/navigation";
import BoardLazy from "../board/BoardLazy";

export default function HeroBoard() {
  const router = useRouter();
  return <BoardLazy mode="hero" focus="overview" onSelect={(id) => router.push(`/board/#${id}`)} showLabels />;
}
