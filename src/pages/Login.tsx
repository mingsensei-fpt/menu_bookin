import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(email, password);
    if (!ok) setError(true);
  };

  return (
    <div className="flex h-dvh items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Staff Login</h1>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(false); }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter email"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter password"
            required
          />
        </div>

        {error && (
          <p className="text-xs font-medium text-destructive">Invalid email or password</p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow transition-transform active:scale-[0.98]"
        >
          Login
        </button>
      </form>
    </div>
  );
}
