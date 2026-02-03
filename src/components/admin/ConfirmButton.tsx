"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmText: string;
};

export default function ConfirmButton({ confirmText, onClick, ...props }: Props) {
  return (
    <button
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
