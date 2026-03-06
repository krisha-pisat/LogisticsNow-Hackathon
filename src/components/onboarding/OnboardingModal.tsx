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
    // Show only once per browser session for demo purposes
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
      icon: <Leaf className="h-12 w-12 text-brand-green mb-4" />,
      body: "Your comprehensive sustainability dashboard. We help logistics managers monitor scope 3 emissions, detect structural route inefficiencies, and simulate clean-fleet optimizations instantly."
    },
    {
      title: "Connect Your Data",
      description: "Seamless integration with your TMS.",
      icon: <UploadCloud className="h-12 w-12 text-brand-blue mb-4" />,
      body: "We've pre-loaded a simulated dataset of 1,000+ shipments for you. In production, connect directly via API to automatically pull live freight routes and fuel consumption logs."
    },
    {
      title: "Explore The Modules",
      description: "Tools built for optimization.",
      icon: <Map className="h-12 w-12 text-brand-orange mb-4" />,
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
        <div className="bg-primary/5 p-8 flex flex-col items-center justify-center text-center min-h-[300px] relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center"
                >
                    {current.icon}
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl font-bold text-center">{current.title}</DialogTitle>
                        <DialogDescription className="text-center">{current.description}</DialogDescription>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-[80%]">
                        {current.body}
                    </p>
                </motion.div>
            </AnimatePresence>

            {/* Stepper Dots */}
            <div className="flex gap-2 mt-8 absolute bottom-6">
                {[1, 2, 3, 4].map(i => (
                    <div 
                        key={i} 
                        className={`h-2 rounded-full transition-all duration-300 ${step === i ? 'w-6 bg-primary' : 'w-2 bg-primary/20'}`} 
                    />
                ))}
            </div>
        </div>
        
        <DialogFooter className="p-4 bg-card flex sm:justify-between items-center w-full sm:flex-row flex-col gap-2">
          {step > 1 ? (
              <Button variant="ghost" onClick={prevStep} className="w-full sm:w-auto">Back</Button>
          ) : (
              <Button variant="ghost" className="w-full sm:w-auto invisible">Back</Button>
          )}

          {step < 4 ? (
              <Button onClick={nextStep} className="w-full sm:w-auto">Continue</Button>
          ) : (
              <Button onClick={handleClose} className="w-full sm:w-auto bg-brand-green hover:bg-brand-green/90 text-white">Get Started</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
