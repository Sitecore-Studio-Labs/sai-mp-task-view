"use client";

import { mdiClose } from "@mdi/js";
import { cn } from "@mp/shared";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { Icon } from "../../lib/icon";
import { buttonVariants } from "./button";

/**
 * Portaled Radix overlays (dropdown/popover/select) render under document.body.
 * Closing them via outside-click can also dismiss a controlled Dialog because Dialog
 * defers pointer-down-outside and re-checks after the nested layer has unmounted
 * (radix-ui/primitives#3971 / #4035).
 */
const PORTALED_FLOATING_UI_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="dropdown-menu-sub-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="select-content"]',
  '[data-slot="context-menu-content"]',
  '[data-slot="context-menu-sub-content"]',
].join(", ");

function isPortaledFloatingUi(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(PORTALED_FLOATING_UI_SELECTOR));
}

function hasOpenPortaledFloatingUi(): boolean {
  return Boolean(document.querySelector(PORTALED_FLOATING_UI_SELECTOR));
}

function getOutsideInteractionTarget(
  event: CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>,
): EventTarget | null {
  return event.detail?.originalEvent?.target ?? event.target;
}

type DialogDismissGuard = {
  /** True when a portaled floating layer was open at pointerdown for this gesture. */
  blockDismissForGestureRef: React.MutableRefObject<boolean>;
};

const DialogDismissGuardContext = React.createContext<DialogDismissGuard | null>(null);

function Dialog({ onOpenChange, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const blockDismissForGestureRef = React.useRef(false);

  React.useEffect(() => {
    const onPointerDownCapture = (event: PointerEvent) => {
      const target = event.target;
      // Explicit close control should always be allowed to dismiss the dialog.
      if (
        target instanceof Element &&
        target.closest('[data-slot="dialog-close"], [data-testid="dialog-close-button"]')
      ) {
        blockDismissForGestureRef.current = false;
        return;
      }
      blockDismissForGestureRef.current = hasOpenPortaledFloatingUi();
    };
    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, []);

  return (
    <DialogDismissGuardContext.Provider value={{ blockDismissForGestureRef }}>
      <DialogPrimitive.Root
        data-slot="dialog"
        onOpenChange={(open) => {
          // Controlled dialogs still receive onOpenChange(false) when a nested
          // dropdown/popover dismisses (radix#4035). Ignore that spurious close.
          if (!open && blockDismissForGestureRef.current) {
            blockDismissForGestureRef.current = false;
            return;
          }
          onOpenChange?.(open);
        }}
        {...props}
      />
    </DialogDismissGuardContext.Provider>
  );
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** When true, the default close button (top-right) is hidden. Use when you render your own close in the header. */
  hideCloseButton?: boolean;
}

function DialogContent({
  className,
  children,
  size = "md",
  hideCloseButton = false,
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: DialogContentProps) {
  const dismissGuard = React.useContext(DialogDismissGuardContext);
  const sizeClasses: Record<NonNullable<DialogContentProps["size"]>, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "w-screen h-screen max-w-none max-h-none rounded-none p-0",
  };

  const shouldBlockOutsideDismiss = (
    event: CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>,
  ) =>
    Boolean(dismissGuard?.blockDismissForGestureRef.current) ||
    isPortaledFloatingUi(getOutsideInteractionTarget(event)) ||
    hasOpenPortaledFloatingUi();

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 shadow-lg duration-200",
          size === "full" ? sizeClasses[size] : "max-w-[calc(100%-2rem)] rounded-lg px-7 py-5",
          size !== "full" && sizeClasses[size],
          className,
        )}
        onPointerDownOutside={(event) => {
          if (shouldBlockOutsideDismiss(event)) {
            event.preventDefault();
          }
          onPointerDownOutside?.(event);
        }}
        onInteractOutside={(event) => {
          if (shouldBlockOutsideDismiss(event)) {
            event.preventDefault();
          }
          onInteractOutside?.(event);
        }}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            className={cn(
              buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                colorScheme: "neutral",
              }),
              "absolute top-2.5 right-4 min-w-0 opacity-70 transition-opacity hover:opacity-100",
            )}
            data-testid="dialog-close-button"
          >
            <Icon path={mdiClose} size={0.9} colorScheme="inherit" className="text-neutral-fg" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-0.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 pt-5 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
