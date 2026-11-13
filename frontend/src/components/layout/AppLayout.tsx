import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

/** Scroll to `/path#section` targets and to the top on a plain route change. */
function useRouteScroll(): void {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Lazy routes render after the effect runs, so retry until the target exists.
    const targetId = location.hash.slice(1);
    let attempts = 0;
    let frame = 0;
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (attempts < 20) {
        attempts += 1;
        frame = window.requestAnimationFrame(scrollToTarget);
      }
    };
    frame = window.requestAnimationFrame(scrollToTarget);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
}

export default function AppLayout() {
  useRouteScroll();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
