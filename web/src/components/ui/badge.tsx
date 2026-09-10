import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent-sent)] text-white",
        secondary: "bg-[var(--search-bg)] text-[var(--text-secondary)]",
        destructive: "bg-[var(--accent-danger)] text-white",
        success: "bg-[var(--accent-success)] text-white",
        outline: "border border-[var(--border-color)] text-[var(--text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
