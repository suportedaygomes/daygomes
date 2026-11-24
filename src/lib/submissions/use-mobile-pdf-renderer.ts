"use client";

import { useEffect, useState } from "react";

export function useMobilePdfRenderer() {
  const [preferCanvas, setPreferCanvas] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent ?? "";
    const mobileUa = /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setPreferCanvas(mobileUa || (narrow && coarse));
  }, []);

  return preferCanvas;
}