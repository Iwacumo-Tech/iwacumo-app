"use client";

// src/app/store/[slug]/_components/StoreHeroCarousel.tsx
// Accepts layout, accentColor, secondaryColor, accentStyle props from the
// server page so white-label slides look genuinely distinct.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoveRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type HeroLayout  = "split" | "full" | "minimal";
type AccentStyle = "bold" | "outline" | "soft";

interface Slide {
  id: number | string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  buttonText: string;
  buttonRoute: string;
}

interface StoreHeroCarouselProps {
  slides:          Slide[];
  layout?:         HeroLayout;
  accentColor?:    string;
  secondaryColor?: string;
  accentStyle?:    AccentStyle;
}

// ─── Button styles ────────────────────────────────────────────────────────────

function HeroButton({
  href,
  label,
  accentColor,
  secondaryColor,
  accentStyle,
}: {
  href:          string;
  label:         string;
  accentColor:   string;
  secondaryColor: string;
  accentStyle:   AccentStyle;
}) {
  const base = "inline-flex items-center gap-2 h-14 px-8 text-sm font-black uppercase tracking-widest transition-all border-[1.5px]";

  if (accentStyle === "bold") {
    return (
      <Link
        href={href}
        className={base}
        style={{ background: accentColor, color: secondaryColor, borderColor: accentColor }}
      >
        {label} <MoveRight size={16} />
      </Link>
    );
  }
  if (accentStyle === "outline") {
    return (
      <Link
        href={href}
        className={base}
        style={{ background: "transparent", color: secondaryColor, borderColor: secondaryColor }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = secondaryColor;
          (e.currentTarget as HTMLElement).style.color      = accentColor;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color      = secondaryColor;
        }}
      >
        {label} <MoveRight size={16} />
      </Link>
    );
  }
  // soft
  return (
    <Link
      href={href}
      className={base}
      style={{ background: accentColor + "22", color: secondaryColor, borderColor: accentColor + "44" }}
    >
      {label} <MoveRight size={16} />
    </Link>
  );
}

// ─── Layout renderers (defined at module level — hard rule #4) ────────────────

function SplitSlide({
  slide,
  accentColor,
  secondaryColor,
  accentStyle,
}: {
  slide:          Slide;
  accentColor:    string;
  secondaryColor: string;
  accentStyle:    AccentStyle;
}) {
  return (
    <div className="absolute inset-0 grid lg:grid-cols-2">
      {/* Image */}
      <div className="relative order-1 lg:order-2 overflow-hidden border-b-[1.5px] lg:border-b-0 lg:border-l-[1.5px]" style={{ borderColor: secondaryColor }}>
        <img src={slide.image} className="w-full h-full object-cover" alt={slide.title} />
        <div className="absolute inset-0 bg-black/5" />
      </div>
      {/* Content */}
      <div className="p-8 lg:p-16 flex flex-col justify-center order-2 lg:order-1 bg-white">
        <span
          className="text-[10px] font-black uppercase tracking-[0.3em] w-fit px-3 py-1 rounded-full mb-6"
          style={{ background: secondaryColor, color: accentColor }}
        >
          {slide.subtitle}
        </span>
        <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-none tracking-tighter mb-6 text-black">
          {slide.title}
        </h2>
        <p className="text-sm md:text-lg font-medium text-gray-600 mb-10 max-w-md leading-relaxed">
          {slide.description}
        </p>
        <HeroButton
          href={slide.buttonRoute}
          label={slide.buttonText}
          accentColor={accentColor}
          secondaryColor={secondaryColor}
          accentStyle={accentStyle}
        />
      </div>
    </div>
  );
}

function FullSlide({
  slide,
  accentColor,
  secondaryColor,
  accentStyle,
}: {
  slide:          Slide;
  accentColor:    string;
  secondaryColor: string;
  accentStyle:    AccentStyle;
}) {
  return (
    <div className="absolute inset-0">
      <img src={slide.image} className="w-full h-full object-cover" alt={slide.title} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center px-12 md:px-20">
        <span
          className="text-[10px] font-black uppercase tracking-[0.3em] w-fit px-3 py-1 rounded-full mb-6"
          style={{ background: accentColor, color: secondaryColor }}
        >
          {slide.subtitle}
        </span>
        <h2 className="text-4xl md:text-7xl font-black uppercase italic leading-none tracking-tighter mb-6 text-white max-w-2xl">
          {slide.title}
        </h2>
        <p className="text-sm md:text-lg font-medium text-white/80 mb-10 max-w-md leading-relaxed">
          {slide.description}
        </p>
        <HeroButton
          href={slide.buttonRoute}
          label={slide.buttonText}
          accentColor={accentColor}
          secondaryColor="white"
          accentStyle={accentStyle}
        />
      </div>
    </div>
  );
}

function MinimalSlide({
  slide,
  accentColor,
  secondaryColor,
  accentStyle,
}: {
  slide:          Slide;
  accentColor:    string;
  secondaryColor: string;
  accentStyle:    AccentStyle;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center bg-white">
      <span
        className="text-[10px] font-black uppercase tracking-[0.3em] w-fit px-3 py-1 rounded-full mb-6"
        style={{ background: secondaryColor, color: accentColor }}
      >
        {slide.subtitle}
      </span>
      <h2
        className="text-5xl md:text-8xl font-black uppercase italic leading-none tracking-tighter mb-6"
        style={{ color: secondaryColor }}
      >
        {slide.title}
      </h2>
      <p className="text-base md:text-xl font-medium text-gray-500 mb-10 max-w-xl leading-relaxed">
        {slide.description}
      </p>
      <HeroButton
        href={slide.buttonRoute}
        label={slide.buttonText}
        accentColor={accentColor}
        secondaryColor={secondaryColor}
        accentStyle={accentStyle}
      />
    </div>
  );
}

// ─── Main carousel ────────────────────────────────────────────────────────────

export default function StoreHeroCarousel({
  slides,
  layout         = "split",
  accentColor    = "#FFD700",
  secondaryColor = "#000000",
  accentStyle    = "bold",
}: StoreHeroCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const current = slides[index];

  // Height varies by layout
  const heightClass = layout === "minimal"
    ? "h-[300px] md:h-[400px]"
    : "h-[400px] md:h-[550px]";

  return (
    <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-8 lg:py-12">
      <div
        className={`relative ${heightClass} border-[1.5px] overflow-hidden bg-white`}
        style={{ borderColor: secondaryColor, boxShadow: `4px 4px 0px 0px ${secondaryColor}` }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {layout === "split"   && <SplitSlide   slide={current} accentColor={accentColor} secondaryColor={secondaryColor} accentStyle={accentStyle} />}
            {layout === "full"    && <FullSlide    slide={current} accentColor={accentColor} secondaryColor={secondaryColor} accentStyle={accentStyle} />}
            {layout === "minimal" && <MinimalSlide slide={current} accentColor={accentColor} secondaryColor={secondaryColor} accentStyle={accentStyle} />}
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 right-6 flex gap-2 z-30">
            <button
              onClick={() => setIndex((index - 1 + slides.length) % slides.length)}
              className="p-3 border-[1.5px] rounded-full transition-all"
              style={{ background: "#fff", borderColor: secondaryColor }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = accentColor; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setIndex((index + 1) % slides.length)}
              className="p-3 border-[1.5px] rounded-full transition-all"
              style={{ background: "#fff", borderColor: secondaryColor }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = accentColor; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 left-6 flex gap-2 z-30">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width:      i === index ? "24px" : "6px",
                  background: i === index ? accentColor : secondaryColor + "40",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}