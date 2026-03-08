'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, UploadCloud, Map, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-2 border-emerald-400/20 border-t-emerald-400 animate-spin" />
    </div>
  ),
});

const STEPS = [
  {
    title: 'Welcome to CIOA',
    subtitle: 'Carbon Intelligence & Optimization Agent.',
    icon: Leaf,
    iconColor: 'text-emerald-400',
    accentColor: '#10B981',
    body: 'Your comprehensive sustainability dashboard. We help logistics managers monitor scope 3 emissions, detect structural route inefficiencies, and simulate clean-fleet optimizations instantly.',
  },
  {
    title: 'Connect Your Data',
    subtitle: 'Seamless integration with your TMS.',
    icon: UploadCloud,
    iconColor: 'text-sky-400',
    accentColor: '#38BDF8',
    body: "We've pre-loaded a simulated dataset of 1,000+ shipments for you. In production, connect directly via API to automatically pull live freight routes and fuel consumption logs.",
  },
  {
    title: 'Explore The Modules',
    subtitle: 'Tools built for optimization.',
    icon: Map,
    iconColor: 'text-amber-400',
    accentColor: '#FBBF24',
    body: 'Use the sidebar to navigate between high-level ESG metrics, granular lane analysis maps, and our What-If simulation engine to plan fleet migrations accurately.',
  },
  {
    title: "You're Ready",
    subtitle: 'Start optimizing your logistics network.',
    icon: CheckCircle,
    iconColor: 'text-emerald-400',
    accentColor: '#10B981',
    body: "Try adjusting the global filters in the top header to recalculate baseline emissions on the fly. Let's get started!",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('cioa-onboarding-seen');
    if (hasSeen) {
      router.replace('/dashboard');
      return;
    }
    setMounted(true);
  }, [router]);

  const handleComplete = () => {
    sessionStorage.setItem('cioa-onboarding-seen', 'true');
    router.push('/dashboard');
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="w-12 h-12 rounded-full border-2 border-emerald-400/20 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  const current = STEPS[step];
  const IconComponent = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="h-screen w-screen overflow-hidden relative"
      style={{ background: '#0A0A0F' }}
    >
      {/* ─── Ambient glow effects ─── */}
      <div className="absolute top-0 bottom-0 right-0 z-0 overflow-hidden pointer-events-none" style={{ left: '45%' }}>
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full blur-[200px] opacity-[0.06]"
          style={{
            background: `radial-gradient(circle, ${current.accentColor} 0%, transparent 70%)`,
            top: '20%',
            right: '15%',
          }}
          animate={{
            top: ['20%', '25%', '20%'],
            right: ['15%', '20%', '15%'],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[160px] opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
            bottom: '10%',
            right: '10%',
          }}
          animate={{
            bottom: ['10%', '15%', '10%'],
            right: ['10%', '5%', '10%'],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ─── Spline Orb — large background element ─── */}
      <motion.div
        className="absolute inset-0 z-[1] bg-[#2E2E2E]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        <div
          className="absolute h-full hidden md:block bg-[#0A0A0F]"
          style={{
            width: '55%',
            left: '-5%',
            transform: 'scale(0.75)',
            transformOrigin: 'center center',
          }}
        >
          <Spline scene="https://prod.spline.design/wpDIraZBRDDmClFz/scene.splinecode" />
        </div>
      </motion.div>

      {/* ─── Content overlay ─── */}
      <div className="relative z-10 h-full flex pointer-events-none">
        {/* Left spacer — lets the orb show through */}
        <div className="hidden md:block w-[45%] pointer-events-none" />

        {/* Right — Glass panel with content */}
        <motion.div
          className="flex-1 flex flex-col relative pointer-events-auto"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glassmorphism panel */}
          <div
            className="absolute inset-0 border-l"
            style={{
              background: '#2E2E2E',
              borderColor: 'rgba(255,255,255,0.04)',
            }}
          />

          {/* Gradient accent line on left edge */}
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-[1px]"
            style={{
              background: `linear-gradient(to bottom, transparent 10%, ${current.accentColor}20 30%, ${current.accentColor}40 50%, ${current.accentColor}20 70%, transparent 90%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          />

          {/* Skip button */}
          <div className="absolute top-5 right-6 z-10">
            <button
              onClick={handleComplete}
              className="text-white/25 hover:text-white/50 text-[11px] font-medium tracking-wider uppercase transition-colors duration-300"
            >
              Skip
            </button>
          </div>

          {/* Main content */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-10 md:px-16 z-[3]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center max-w-[480px] w-full"
              >
                {/* Icon with glow ring */}
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.12 }}
                  className="relative mb-10"
                >
                  <div
                    className="absolute inset-0 rounded-2xl blur-xl opacity-30"
                    style={{ background: current.accentColor }}
                  />
                  <div
                    className="relative w-18 h-18 rounded-2xl flex items-center justify-center border"
                    style={{
                      background: `${current.accentColor}12`,
                      borderColor: `${current.accentColor}25`,
                    }}
                  >
                    <IconComponent className={`w-9 h-9 ${current.iconColor}`} />
                  </div>
                </motion.div>

                {/* Step counter with line accents */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.18 }}
                  className="flex items-center gap-3 mb-5"
                >
                  <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/15" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/30">
                    Step {step + 1} / {STEPS.length}
                  </span>
                  <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/15" />
                </motion.div>

                {/* Title */}
                <h1 className="text-4xl md:text-[3.25rem] font-bold tracking-tight text-white mb-3 leading-tight">
                  {current.title}
                </h1>

                {/* Subtitle */}
                <p className="text-[17px] font-medium mb-7" style={{ color: `${current.accentColor}CC` }}>
                  {current.subtitle}
                </p>

                {/* Divider line */}
                <div className="w-14 h-px bg-white/10 mb-7" />

                {/* Body */}
                <p className="text-[16px] text-white/50 leading-[1.9] max-w-[440px] font-light">
                  {current.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom navigation */}
          <div className="relative z-[3] px-10 md:px-16 pb-8 flex flex-col items-center gap-6">
            {/* Stepper Dots */}
            <div className="flex gap-2 items-center">
              {STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  className="h-[5px] rounded-full relative overflow-hidden cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                  animate={{ width: step === i ? 28 : 7 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  onClick={() => setStep(i)}
                >
                  {step === i && (
                    <motion.div
                      layoutId="onboarding-step-active"
                      className="absolute inset-0 rounded-full"
                      style={{ background: current.accentColor }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 w-full max-w-sm">
              {step > 0 ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="flex-1">
                  <button
                    onClick={prevStep}
                    className="w-full h-11 text-[13px] font-medium text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                </motion.div>
              ) : (
                <div className="flex-1" />
              )}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="flex-1">
                <button
                  onClick={isLast ? handleComplete : nextStep}
                  className="w-full h-11 text-[13px] font-semibold text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${current.accentColor}, ${current.accentColor}DD)`,
                    boxShadow: `0 4px 16px ${current.accentColor}30`,
                  }}
                >
                  {isLast ? 'Get Started' : 'Continue'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Brand watermark */}
      <motion.p
        className="absolute bottom-4 left-6 z-20 text-white/10 text-[9px] font-medium tracking-[0.25em] uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        CIOA Platform
      </motion.p>
    </div>
  );
}
