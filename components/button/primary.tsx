// Button / Primary — pill preenchido com a superfície inversa (Subscribe).
export function ButtonPrimary({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      data-component="Button / Primary"
      className="flex h-10 items-center justify-center rounded-full bg-surface-inverse px-4 text-body font-medium text-text-inverse focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
    >
      {children}
    </button>
  );
}
