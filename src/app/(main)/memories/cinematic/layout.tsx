export default function CinematicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cinematic-scroll h-screen overflow-y-auto overflow-x-hidden">
      {children}
    </div>
  );
}
