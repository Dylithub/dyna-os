// A styled button matching the terminal aesthetic.
// React components receive their configuration through "props" (properties).

interface TerminalButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
  active?: boolean;
  className?: string;
}

export default function TerminalButton({
  onClick,
  children,
  small,
  active,
  className = "",
}: TerminalButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        bg-terminal-card-highlight border border-terminal text-terminal
        font-mono cursor-pointer tracking-wider transition-all
        active:bg-terminal-active
        ${small ? "px-2.5 py-1 text-[10px] min-h-[32px]" : "px-4 py-3 text-xs min-h-[44px]"}
        ${active ? "bg-terminal-active" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
