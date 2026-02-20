export function Footer() {
  return (
    <footer className="border-t border-glass-border py-8 px-6">
      <div className="mx-auto max-w-5xl flex items-center justify-between text-muted text-xs">
        <span>relay — communication without capability leakage</span>
        <span>&copy; {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
