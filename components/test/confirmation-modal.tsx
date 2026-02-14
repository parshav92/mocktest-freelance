"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TEST_CONFIG } from "@/lib/config/test-rules";

interface StartConfirmationProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function StartConfirmation({
  open,
  onConfirm,
  onCancel,
  loading,
}: StartConfirmationProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">
            {TEST_CONFIG.instructions.confirmationTitle}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {TEST_CONFIG.instructions.confirmationSubtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[#1a2744] font-bold">•</span>
              The timer will start immediately once you begin.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1a2744] font-bold">•</span>
              You cannot go back to the instructions.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1a2744] font-bold">•</span>
              Do not switch tabs or windows during the test.
            </li>
            {TEST_CONFIG.antiCheat.requireFullscreen && (
              <li className="flex items-start gap-2">
                <span className="text-[#1a2744] font-bold">•</span>
                The test will open in fullscreen mode. Do not exit fullscreen.
              </li>
            )}
          </ul>
        </div>

        <DialogFooter className="gap-4 flex flex-row  sm:gap-4">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Go Back
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-[#1a2744] hover:bg-[#1a2744]/90"
            disabled={loading}
          >
            {loading ? "Starting..." : "Start Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Anti-cheat Warning Modal
// ============================================

interface WarningModalProps {
  open: boolean;
  message: string;
  onDismiss: () => void;
}

export function AntiCheatWarning({
  open,
  message,
  onDismiss,
}: WarningModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-md border-red-200">
        <DialogHeader>
          <DialogTitle className="text-red-600">
            ⚠️ Warning
          </DialogTitle>
          <DialogDescription className="pt-2 text-red-700">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={onDismiss}
            variant="destructive"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
