'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Leaf, UploadCloud, Map, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('cioa-onboarding-seen');
    if (!hasSeen) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem('cioa-onboarding-seen', 'true');
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const content = [
    {
      title: "Welcome to CIOA",
      description: "Carbon Intelligence & Optimization Agent.",
      icon: <Leaf className="h-12 w-12 text-primary mb-4" />,
      body: "Your comprehensive sustainability dashboard. We help logistics managers monitor scope 3 emissions, detect structural route inefficiencies, and simulate clean-fleet optimizations instantly."
    },
    {
      title: "Connect Your Data",
      description: "Seamless integration with your TMS.",
      icon: <UploadCloud className="h-12 w-12 text-blue-500 mb-4" />,
      body: "We've pre-loaded a simulated dataset of 1,000+ shipments for you. In production, connect directly via API to automatically pull live freight routes and fuel consumption logs."
    },
    {
      title: "Explore The Modules",
      description: "Tools built for optimization.",
      icon: <Map className="h-12 w-12 text-orange-500 mb-4" />,
      body: "Use the sidebar to navigate between high-level ESG metrics, granular lane analysis maps, and our What-If simulation engine to plan fleet migrations accurately."
    },
    {
      title: "You're Ready",
      description: "Start optimizing your logistics network.",
      icon: <CheckCircle className="h-12 w-12 text-foreground mb-4" />,
      body: "Try adjusting the global filters in the top header to recalculate baseline emissions on the fly. Let's get started!"
    }
  ];

  const current = content[step - 1];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-xl">
        <div className="bg-primary/5 p-8 flex flex-col items-center justify-center text-center min-h-[300px] relative overflow-hidden">
          {/* Subtle animated gradient background */}
          <motion.div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(circle at 30% 50%, rgba(16,185,129,0.15), transparent 60%), radial-gradient(circle at 70% 50%, rgba(59,130,246,0.1), transparent 60%)'
            }}
            animate={{
              background: [
                'radial-gradient(circle at 30% 50%, rgba(16,185,129,0.15), transparent 60%), radial-gradient(circle at 70% 50%, rgba(59,130,246,0.1), transparent 60%)',
                'radial-gradient(circle at 70% 30%, rgba(16,185,129,0.15), transparent 60%), radial-gradient(circle at 30% 70%, rgba(59,130,246,0.1), transparent 60%)',
                'radial-gradient(circle at 30% 50%, rgba(16,185,129,0.15), transparent 60%), radial-gradient(circle at 70% 50%, rgba(59,130,246,0.1), transparent 60%)',
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center relative z-10"
            >
              {/* Icon with bounce animation */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              >
                {current.icon}
              </motion.div>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold text-center">{current.title}</DialogTitle>
                <DialogDescription className="text-center">{current.description}</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[80%]">
                {current.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Stepper Dots with spring layoutId */}
          <div className="flex gap-2 mt-8 absolute bottom-6">
            {[1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="h-2 rounded-full bg-primary/20 relative overflow-hidden"
                animate={{ width: step === i ? 24 : 8 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              >
                {step === i && (
                  <motion.div
                    layoutId="onboarding-dot-active"
                    className="absolute inset-0 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-4 bg-card flex sm:justify-between items-center w-full sm:flex-row flex-col gap-2">
          {step > 1 ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="ghost" onClick={prevStep} className="w-full sm:w-auto">Back</Button>
            </motion.div>
          ) : (
            <Button variant="ghost" className="w-full sm:w-auto invisible">Back</Button>
          )}

          {step < 4 ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={nextStep} className="w-full sm:w-auto">Continue</Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={handleClose} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white">Get Started</Button>
            </motion.div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
