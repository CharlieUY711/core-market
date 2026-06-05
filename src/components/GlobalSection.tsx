"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/experience/i18n-context";

// CoreGlobe solo en cliente - sin SSR
const CoreGlobe = dynamic(
  () => import("@/components/experience/visuals/CoreGlobe").then(m => m.CoreGlobe),
  { ssr: false, loading: () => <div style={{ aspectRatio: "16/7", background: "#0A0A0A" }} /> }
);

export function GlobalSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <section
      id="global"
      ref={ref}
      className="relative"
      style={{ background: "var(--void)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}
      />

      {/* Text header — encima del globo */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--subtle)",
            marginBottom: "1.5rem",
          }}
        >
          {t.global.label}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: "clamp(28px, 4vw, 56px)",
            fontWeight: 300,
            color: "var(--white)",
            lineHeight: 1.15,
            whiteSpace: "pre-line",
            marginBottom: "1.25rem",
          }}
        >
          {t.global.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.45 }}
          style={{
            fontSize: "clamp(14px, 1.5vw, 18px)",
            fontWeight: 300,
            color: "var(--muted)",
            maxWidth: "560px",
            lineHeight: 1.7,
          }}
        >
          {t.global.sub}
        </motion.p>
      </div>

      {/* Globo — ancho completo, sin bordes, sin card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: 0.3 }}
        className="relative w-full"
        style={{ marginTop: "-2rem" }}
      >
        {/* Fade top — fusiona el texto con el globo */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: "120px",
            background: "linear-gradient(to bottom, var(--void) 0%, transparent 100%)",
          }}
        />

        <CoreGlobe
          activeLayer="all"
          autoRotate
          className="w-full"
          style={{ aspectRatio: "16/7" }}
        />

        {/* Fade bottom — fusiona el globo con la sección siguiente */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: "120px",
            background: "linear-gradient(to top, var(--void) 0%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* Regiones — debajo del globo */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pb-24 pt-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center gap-8"
        >
          {t.global.regions.map((region, i) => (
            <span key={region} className="flex items-center gap-8">
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--subtle)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {region}
              </span>
              {i < t.global.regions.length - 1 && (
                <span style={{ color: "var(--subtle)", fontSize: "10px" }}>→</span>
              )}
            </span>
          ))}
          <span style={{ color: "var(--subtle)", fontSize: "10px" }}>→</span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--white)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            CORE
          </span>
          <span style={{ color: "var(--subtle)", fontSize: "10px" }}>→</span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            LATAM
          </span>
        </motion.div>
      </div>
    </section>
  );
}
