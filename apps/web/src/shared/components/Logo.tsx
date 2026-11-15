export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path
          d="M9 11h14M16 11v12"
          style={{ stroke: 'var(--color-orange)' }}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xl font-extrabold tracking-tight">TaskFlow</span>
    </span>
  );
}
