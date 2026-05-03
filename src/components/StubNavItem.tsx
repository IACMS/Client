type StubNavItemProps = {
  children: React.ReactNode;
  className?: string;
};

/** Non-navigating control for routes not yet built; avoids `<a>` without href. */
export function StubNavItem({ children, className = "" }: StubNavItemProps) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      aria-disabled="true"
      className={`inline bg-transparent p-0 border-0 font-inherit text-left cursor-not-allowed opacity-75 ${className}`}
    >
      {children}
    </button>
  );
}
