export function AuroraBackground({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null;
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Aurora blobs */}
      <div
        className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)", animation: "float 12s ease-in-out infinite" }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
        style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)", animation: "float 15s ease-in-out 2s infinite" }}
      />
      <div
        className="absolute -bottom-40 left-1/4 h-[450px] w-[450px] rounded-full opacity-15 blur-[110px]"
        style={{ background: "radial-gradient(circle, #34d399, transparent 70%)", animation: "float 18s ease-in-out 4s infinite" }}
      />
    </div>
  );
}
