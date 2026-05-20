import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  /** Tailwind gradient classes, e.g. "from-pink-500 to-rose-500" */
  gradient?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Shared hero header used on every page for visual consistency.
 * Mirrors the dashboard hero style.
 */
export function PageHero({
  title,
  subtitle,
  emoji,
  gradient = "from-primary via-primary/90 to-cyan-600",
  children,
  className,
}: PageHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl sm:p-8",
        gradient,
        className
      )}
    >
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-pink-400/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title} {emoji && <span>{emoji}</span>}
          </h1>
          {subtitle && (
            <p className="mt-2 text-base text-white/90 sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
