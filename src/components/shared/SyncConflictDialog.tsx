"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface SyncConflictDialogProps {
  open: boolean;
  onClose: () => void;
  onResolve: (choice: 'local' | 'server') => void;
  localProgress: {
    chapterTitle: string;
    page: number;
    scrollRatio: number;
    updatedAt: string;
  };
  serverProgress: {
    chapterTitle: string;
    page: number;
    scrollRatio: number;
    updatedAt: string;
  };
}

export default function SyncConflictDialog({
  open,
  onClose,
  onResolve,
  localProgress,
  serverProgress,
}: SyncConflictDialogProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-600" />
            Sync Conflict
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            We found different reading progress for this book on different devices. Which version would you like to keep?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-black rounded-lg p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                This Device
              </p>
              <p className="text-sm font-bold mb-1">{localProgress.chapterTitle}</p>
              <p className="text-xs text-gray-600 mb-2">
                Page {localProgress.page} · {Math.round(localProgress.scrollRatio * 100)}%
              </p>
              <p className="text-[10px] text-gray-400">
                {formatDate(localProgress.updatedAt)}
              </p>
            </div>

            <div className="border-2 border-black rounded-lg p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                Cloud
              </p>
              <p className="text-sm font-bold mb-1">{serverProgress.chapterTitle}</p>
              <p className="text-xs text-gray-600 mb-2">
                Page {serverProgress.page} · {Math.round(serverProgress.scrollRatio * 100)}%
              </p>
              <p className="text-[10px] text-gray-400">
                {formatDate(serverProgress.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onResolve('local')}
              className="flex-1 h-12 font-black uppercase italic tracking-widest"
            >
              Keep This Device
            </Button>
            <Button
              onClick={() => onResolve('server')}
              variant="outline"
              className="flex-1 h-12 font-black uppercase italic tracking-widest"
            >
              Use Cloud Version
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
