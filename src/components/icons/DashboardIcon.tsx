export function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 15h18" />
      <path d="m7 11 3-3 3 3 4-4" />
      <path d="M7 15v4" />
      <path d="M12 15v4" />
      <path d="M17 15v4" />
    </svg>
  );
}
