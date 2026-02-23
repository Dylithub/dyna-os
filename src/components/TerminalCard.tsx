// A reusable card container with the terminal styling.
// In React, children is whatever you put between the opening and closing tags:
//   <TerminalCard title="MY CARD">...this is children...</TerminalCard>

interface TerminalCardProps {
  title?: string;
  highlight?: boolean;
  children: React.ReactNode;
}

export default function TerminalCard({ title, highlight, children }: TerminalCardProps) {
  return (
    <div
      className={`border rounded p-4 mb-4 ${
        highlight
          ? "bg-terminal-card-highlight border-terminal"
          : "bg-terminal-card border-terminal-border"
      }`}
    >
      {title && (
        <div className="text-terminal-bright text-xs mb-2.5 tracking-wider">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
