import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { AnnouncementsPage } from "@/components/AnnouncementsPage"; // New Component
import { CallManager } from "@/components/CallManager";
import { useAuth } from "@/hooks/use-auth";
import { useMyIdentity, useSeedData } from "@/hooks/use-identity";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: identity, isLoading: identityLoading } = useMyIdentity();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(true); 
  const seedData = useSeedData();

  if (authLoading || identityLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">Connecting to campus network...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Landing Page
  if (!isAuthenticated) {
     return <LandingPage />;
  }
  
  // Logged in but no identity
  if (!identity) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <h1 className="text-3xl font-display font-bold mb-4">Account Setup Required</h1>
        <p className="text-muted-foreground mb-8">
          Your account is verified, but hasn't been linked to a Student or Staff profile yet.
        </p>
        <Button 
          size="lg" 
          onClick={() => seedData.mutate()} 
          disabled={seedData.isPending}
          className="w-full"
        >
          {seedData.isPending ? "Setting up..." : "Initialize Demo Profile"}
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          (This is a demo action to seed the database with mock identities)
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <CallManager />
      
      {/* Sidebar: Always visible on desktop, toggleable on mobile */}
      <Sidebar 
        activeConversationId={activeConversationId} 
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setMobileMenuOpen(false); 
        }}
        isMobileOpen={mobileMenuOpen}
        onShowAnnouncements={() => {
            setActiveConversationId(null);
            setMobileMenuOpen(false);
        }}
      />
      
      <main className="flex-1 flex flex-col relative w-full h-full">
         {activeConversationId ? (
             <ChatArea 
               conversationId={activeConversationId} 
               onBack={() => setMobileMenuOpen(true)}
             />
         ) : (
             <AnnouncementsPage />
         )}
      </main>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 font-display font-bold text-2xl text-primary">
          <span className="p-2 bg-white rounded-lg shadow-sm">🎓</span>
          CampusChat
        </div>
        <Link href="/login">
          <Button>Log In</Button>
        </Link>
      </nav>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-12 max-w-7xl mx-auto">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-2">
            Official Communication Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-slate-900 leading-tight">
            Connect with your <br/>
            <span className="text-primary relative">
              Campus
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                 <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto md:mx-0">
            A unified messaging experience for students, faculty, and staff. Secure, organized, and built for academic collaboration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg shadow-xl shadow-primary/20">
                Get Started
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-white/50 backdrop-blur-sm">
              Learn More
            </Button>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md md:max-w-none relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl opacity-50" />
          {/* Use a placeholder SVG for the hero image since we avoid stock photos */}
          <div className="relative bg-white p-2 rounded-[2rem] shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
             <div className="bg-slate-950 rounded-[1.5rem] overflow-hidden aspect-[4/5] relative flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-800"></div>
                <div className="z-10 text-white text-center p-8">
                  <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg shadow-green-500/50">💬</div>
                  <h3 className="text-2xl font-bold mb-2">Real-time Chat</h3>
                  <p className="text-slate-400">Connect instantly with your department and peers.</p>
                </div>
                {/* Decorative UI elements */}
                <div className="absolute bottom-8 left-8 right-8 bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700/50 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">VC</div>
                   <div className="text-left">
                     <div className="text-xs text-slate-400">Vice Chancellor</div>
                     <div className="text-sm font-medium text-white">Meeting at 3PM?</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      <footer className="py-6 text-center text-muted-foreground text-sm">
        &copy; 2024 University Communication Systems. Secure & Encrypted.
      </footer>
    </div>
  );
}
