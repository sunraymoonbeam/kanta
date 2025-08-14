import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "./utils";
import { X } from "lucide-react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, children, className }: DialogProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in-0"
        onClick={onClose}
      />
      
      {/* Dialog Content */}
      <div
        className={cn(
          "relative bg-background rounded-lg shadow-lg max-w-4xl max-h-[90vh] w-full mx-4 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export function DialogHeader({ children, className, onClose }: DialogHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between p-4 border-b border-border", className)}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogContent({ children, className }: DialogContentProps) {
  return (
    <div className={cn("p-4", className)}>
      {children}
    </div>
  );
}

export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 p-4 border-t border-border", className)}>
      {children}
    </div>
  );
}