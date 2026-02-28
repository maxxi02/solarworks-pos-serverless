"use client";

import { useEffect, ReactNode } from "react";
import Lenis from "lenis";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
            infinite: false,
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Initial check for hash scrolling on load
        if (window.location.hash) {
            const el = document.querySelector(window.location.hash);
            if (el) {
                lenis.scrollTo(el as HTMLElement);
            }
        }

        return () => {
            lenis.destroy();
        };
    }, []);

    return <>{children}</>;
}
