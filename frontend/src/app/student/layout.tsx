import { StudentSidebar } from "@/components/layout/student-sidebar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <StudentSidebar />
      <main className="md:ml-60 lg:ml-64 min-h-screen flex flex-col justify-between">
        <div className="pt-14 md:pt-0 flex-1">{children}</div>
        {/* Creator Footer */}
        <footer className="w-full py-4 text-center border-t border-border/40 bg-muted/5 mt-auto">
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/65 font-medium tracking-wide">
            System Creator: <span className="font-bold text-muted-foreground/80">EED Soft Consult</span> &nbsp;·&nbsp; info@eedconsult.com &nbsp;·&nbsp; +233 558075023
          </p>
        </footer>
      </main>
    </div>
  );
}
