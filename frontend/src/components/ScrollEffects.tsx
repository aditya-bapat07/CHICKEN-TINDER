import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "./UI";

/** Motion is progressive enhancement: content stays visible without observers. */
export default function ScrollEffects() {
  const { pathname } = useLocation();
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem("ct_motion_paused") === "true";
    } catch {
      return false;
    }
  });
  const [systemReduced, setSystemReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [showTop, setShowTop] = useState(false);
  const progress = useRef<HTMLDivElement>(null);
  const reduced = paused || systemReduced;

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = reduced ? "off" : "on";
    const main = document.getElementById("main");
    if (!main) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const range = root.scrollHeight - innerHeight;
      const fraction =
        range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0;
      progress.current?.style.setProperty("transform", `scaleX(${fraction})`);
      setShowTop(scrollY > 500);
      const hero = main.querySelector<HTMLElement>(".hero");
      if (hero) {
        const rect = hero.getBoundingClientRect();
        const travel = reduced
          ? 0
          : Math.min(70, Math.max(-20, -rect.top * 0.16));
        hero.style.setProperty("--hero-travel", `${travel}px`);
        hero.style.setProperty("--hero-turn", `${travel * 0.6}deg`);
      }
      const story = main.querySelector<HTMLElement>(".scroll-story");
      if (story) {
        const rect = story.getBoundingClientRect();
        const fraction = Math.max(
          0,
          Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)),
        );
        story.style.setProperty(
          "--story-turn",
          reduced ? "0deg" : `${fraction * 75 - 30}deg`,
        );
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const resize =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    resize?.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const marked = new Set<HTMLElement>();
    const observer =
      !reduced && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries)
                if (entry.isIntersecting) {
                  entry.target.classList.add("is-visible");
                  observer?.unobserve(entry.target);
                }
            },
            { threshold: 0.05, rootMargin: "0px 0px -20px 0px" },
          )
        : null;
    const scan = () => {
      for (const element of marked)
        if (!main.contains(element)) {
          observer?.unobserve(element);
          marked.delete(element);
        }
      if (observer)
        main
          .querySelectorAll<HTMLElement>(
            ".page-heading, .stats-strip, .section-heading, .activity-card, .match-card, .settings-panel, .scroll-story, .leaderboard-intro, .api-example",
          )
          .forEach((element, i) => {
            if (marked.has(element)) return;
            marked.add(element);
            // Above-the-fold content is never held behind an entrance animation.
            if (element.getBoundingClientRect().top < innerHeight - 24) return;
            element.style.setProperty("--reveal-delay", `${(i % 3) * 65}ms`);
            element.classList.add("motion-ready");
            observer.observe(element);
          });
      schedule();
    };
    const mutation = new MutationObserver(scan);
    mutation.observe(main, { childList: true, subtree: true });
    const revealFocus = (event: FocusEvent) => {
      (event.target as HTMLElement)
        .closest(".motion-ready")
        ?.classList.add("is-visible");
    };
    main.addEventListener("focusin", revealFocus);
    scan();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resize?.disconnect();
      mutation.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      main.removeEventListener("focusin", revealFocus);
      marked.forEach((element) => {
        element.classList.remove("motion-ready", "is-visible");
        element.style.removeProperty("--reveal-delay");
      });
      root.dataset.motion = "off";
    };
  }, [pathname, reduced]);

  function toggle() {
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem("ct_motion_paused", String(next));
    } catch {
      /* Remains available for this visit. */
    }
  }
  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <div ref={progress} />
      </div>
      <button
        className="motion-toggle"
        onClick={toggle}
        disabled={systemReduced}
        aria-pressed={reduced}
        aria-label={
          systemReduced
            ? "Animations disabled by system preference"
            : "Pause animations"
        }
        title={
          systemReduced
            ? "Reduced motion is enabled on your device"
            : reduced
              ? "Resume animations"
              : "Pause animations"
        }
      >
        <span aria-hidden="true">{reduced ? "Ⅱ" : "✳"}</span>
        <span className="motion-toggle-label">
          {reduced ? "Motion off" : "Motion on"}
        </span>
      </button>
      {showTop && (
        <button
          className="back-to-top"
          aria-label="Back to top"
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: reduced ? "instant" : "smooth",
            });
            document.getElementById("main")?.focus({ preventScroll: true });
          }}
        >
          <Icon name="arrow" size={18} />
          <span>Back to top</span>
        </button>
      )}
    </>
  );
}
