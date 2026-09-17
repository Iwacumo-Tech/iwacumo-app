"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function BeforeInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('iwacumo_install_dismissed');
    if (dismissed) return;

    // Check visit count
    const visits = parseInt(localStorage.getItem('iwacumo_visits') || '0', 10);
    localStorage.setItem('iwacumo_visits', String(visits + 1));

    // Show prompt after 2+ visits
    if (visits >= 2) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handler);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'dismissed') {
      localStorage.setItem('iwacumo_install_dismissed', 'true');
      setDismissed(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('iwacumo_install_dismissed', 'true');
    setDismissed(true);
    setShowPrompt(false);
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border-2 border-black rounded-lg shadow-lg p-4 z-50">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-[#FFD700] rounded-lg flex items-center justify-center shrink-0">
          <Download size={24} className="text-black" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-black uppercase italic text-sm mb-1">Install Iwacumo</h3>
          <p className="text-xs text-gray-600 mb-3">
            Add Iwacumo to your home screen for quick access and offline reading.
          </p>
          
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 h-10 text-xs font-black uppercase italic tracking-widest"
            >
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="h-10 text-xs font-black uppercase italic tracking-widest"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
