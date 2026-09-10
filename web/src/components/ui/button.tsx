import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-sent)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent-sent)] text-white hover:brightness-105",
        destructive: "bg-[var(--accent-danger)] text-white hover:brightness-105",
        outline: "border border-[var(--border-color)] bg-transparent hover:bg-[var(--hover-bg)] text-[var(--text-primary)]",
        secondary: "bg-[var(--search-bg)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
        ghost: "hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        link: "text-[var(--accent-sent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 py-1",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-9 px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
