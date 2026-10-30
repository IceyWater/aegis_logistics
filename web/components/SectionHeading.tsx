export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="section-label">{children}</span>;
}

export function PageIntro({
  label,
  title,
  emphasis,
  children,
}: {
  label: string;
  title: string;
  emphasis?: string;
  children: React.ReactNode;
}) {
  return (
    <header className="page-intro">
      <SectionLabel>{label}</SectionLabel>
      <h1>
        {title}
        {emphasis && (
          <>
            <br />
            <em>{emphasis}</em>
          </>
        )}
      </h1>
      <p>{children}</p>
    </header>
  );
}

export function LoadingState({ label = "Running trained model…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function ErrorMessage({ children }: { children?: React.ReactNode }) {
  return children ? (
    <p className="error-message" role="alert">
      {children}
    </p>
  ) : null;
}
