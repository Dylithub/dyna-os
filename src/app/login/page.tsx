import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div
      id="terminal-frame"
      className="w-full min-h-screen bg-terminal-bg relative flex flex-col overflow-hidden"
    >
      <header className="px-5 py-4 border-b border-terminal-border bg-terminal-surface">
        <div className="text-terminal text-base tracking-widest">
          DYNA OPTICS
        </div>
        <div className="text-terminal-dim text-[10px] mt-0.5 tracking-wider">
          LIFESTYLE OS
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="border border-terminal-border bg-terminal-card p-6 space-y-4">
            <h2 className="text-terminal-bright text-sm tracking-widest text-center">
              AUTHENTICATE
            </h2>
            <p className="text-terminal-dim text-xs tracking-wider text-center">
              Sign in to sync your data across devices.
            </p>

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full py-3 px-4 text-xs tracking-wider font-mono
                  border border-terminal-border bg-terminal-surface text-terminal
                  hover:bg-terminal-active hover:text-terminal-bright
                  transition-all cursor-pointer"
              >
                {">"} SIGN IN WITH GOOGLE
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full py-3 px-4 text-xs tracking-wider font-mono
                  border border-terminal-border bg-terminal-surface text-terminal
                  hover:bg-terminal-active hover:text-terminal-bright
                  transition-all cursor-pointer"
              >
                {">"} SIGN IN WITH GITHUB
              </button>
            </form>
          </div>

          <p className="text-terminal-dim text-[10px] tracking-wider text-center">
            Your data is stored locally until you sign in.
          </p>
        </div>
      </main>
    </div>
  );
}
