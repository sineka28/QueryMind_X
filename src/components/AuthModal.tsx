import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Mail, Lock, User, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="glass-card noise-texture w-full max-w-md p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 shadow-lg shadow-primary-500/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold gradient-text">
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === "signin" ? "Sign in to QueryMind X" : "Join QueryMind X"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <InputField icon={User} placeholder="Full name" value={name} onChange={setName} type="text" />
          )}
          <InputField icon={Mail} placeholder="Email address" value={email} onChange={setEmail} type="email" required />
          <InputField icon={Lock} placeholder="Password" value={password} onChange={setPassword} type="password" required minLength={6} />

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-danger-500/10 border border-danger-500/20 px-3.5 py-2.5 text-xs text-danger-300">
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit" disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.99 }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                {mode === "signin" ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </form>

        {/* Toggle */}
        <div className="mt-4 text-center">
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-xs text-slate-400 hover:text-primary-300 transition-colors"
          >
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1.5 justify-center text-[10px] text-slate-600">
          <Sparkles className="h-3 w-3" />
          Secure email/password authentication via Supabase
        </div>
      </motion.div>
    </motion.div>
  );
}

function InputField({ icon: Icon, placeholder, value, onChange, type, required, minLength }: {
  icon: typeof Mail; placeholder: string; value: string; onChange: (v: string) => void; type: string; required?: boolean; minLength?: number;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500/40 focus:bg-white/[0.06] transition-colors"
      />
    </div>
  );
}
