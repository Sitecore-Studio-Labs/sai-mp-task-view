declare module "sonner" {
  import type { ReactNode } from "react";

  interface ToastAction {
    label: ReactNode;
    onClick?: () => void;
  }

  interface ToastOptions {
    action?: ToastAction;
    description?: ReactNode;
    duration?: number;
    [key: string]: unknown;
  }

  export function toast(message: string | ReactNode, options?: ToastOptions): void | { dismiss: () => void };
  export namespace toast {
    export function error(message: string | ReactNode, options?: ToastOptions): void | { dismiss: () => void };
    export function success(message: string | ReactNode, options?: ToastOptions): void | { dismiss: () => void };
    export function promise<T>(p: Promise<T>, options?: ToastOptions): void | { dismiss: () => void };
  }

  export interface ToasterProps {
    theme?: "light" | "dark" | "system";
    position?: string;
    expand?: boolean;
    className?: string;
    toastOptions?: { classNames?: Record<string, string> };
    [key: string]: unknown;
  }

  export const Toaster: React.ComponentType<ToasterProps>;
}
