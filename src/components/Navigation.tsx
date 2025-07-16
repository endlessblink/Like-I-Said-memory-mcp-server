import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ExportImport } from '@/components/ExportImport';
import { SettingsDropdown } from '@/components/SettingsDropdown';
import { BarChart3, Brain, Link, Bot, Menu, X } from 'lucide-react';

interface NavigationProps {
  currentTab: 'dashboard' | 'memories' | 'relationships' | 'ai';
  memoriesCount: number;
  wsConnected: boolean;
  onTabChange: (tab: 'dashboard' | 'memories' | 'relationships' | 'ai') => void;
  onAddMemory: () => void;
  onEnhanceAll?: () => void;
  isEnhancing?: boolean;
  llmProvider?: string;
  memories?: any[];
  onImportMemories?: (memories: any[]) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  memoriesCount,
  wsConnected,
  onTabChange,
  onAddMemory,
  onEnhanceAll,
  isEnhancing = false,
  llmProvider = "none",
  memories = [],
  onImportMemories,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationTabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "memories", label: "Memories", icon: Brain },
    { id: "relationships", label: "Relationships", icon: Link },
    { id: "ai", label: "AI Enhancement", icon: Bot }
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId as any);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="glass-effect border-b border-border/50 shadow-xl sticky top-0 z-50" style={{ 
      background: 'var(--glass-bg)', 
      backdropFilter: 'var(--glass-backdrop)',
      borderColor: 'var(--glass-border)'
    }}>
      <div className="w-full" style={{ 
        paddingLeft: 'var(--space-4)', 
        paddingRight: 'var(--space-4)' 
      }}>
        <div className="flex items-center justify-between" style={{ height: 'var(--nav-height)' }}>
          
          {/* Logo and Title Section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Logo */}
            <div className="relative">
              <div 
                className="rounded-lg flex items-center justify-center shadow-lg border border-border/10"
                style={{ 
                  width: 'var(--space-10)', 
                  height: 'var(--space-10)',
                  background: 'var(--gradient-primary)'
                }}
              >
                <div 
                  className="bg-background/90 rounded-sm flex items-center justify-center"
                  style={{ 
                    width: 'var(--space-6)', 
                    height: 'var(--space-6)' 
                  }}
                >
                  <span 
                    className="font-black text-sm"
                    style={{ color: 'var(--primary-600)' }}
                  >
                    L
                  </span>
                </div>
              </div>
              <div 
                className="absolute rounded-full border-2"
                style={{ 
                  top: 'calc(-1 * var(--space-1))',
                  right: 'calc(-1 * var(--space-1))',
                  width: 'var(--space-3)', 
                  height: 'var(--space-3)',
                  backgroundColor: 'var(--success)',
                  borderColor: 'var(--background)'
                }}
              ></div>
            </div>
            
            {/* Typography */}
            <div className="hidden sm:flex flex-col justify-center">
              <h1 className="text-lg font-black text-foreground tracking-tight leading-none">
                LIKE I SAID
              </h1>
              <div className="text-xs text-muted-foreground font-medium tracking-widest">
                MEMORY
              </div>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div 
            className="hidden md:flex items-center backdrop-blur-sm rounded-xl border shadow-lg"
            style={{ 
              gap: 'var(--space-2)',
              backgroundColor: 'var(--glass-bg)',
              padding: 'var(--space-3)',
              borderColor: 'var(--glass-border)'
            }}
          >
            {navigationTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center rounded-lg text-sm font-semibold transition-all`}
                  style={{
                    gap: 'var(--space-2)',
                    padding: `var(--space-2) var(--space-4)`,
                    minHeight: 'var(--space-11)',
                    background: currentTab === tab.id ? 'var(--gradient-primary)' : 'transparent',
                    color: currentTab === tab.id ? 'white' : 'var(--muted-foreground)',
                    transitionDuration: 'var(--duration-200)',
                  }}
                  onMouseEnter={(e) => {
                    if (currentTab !== tab.id) {
                      e.currentTarget.style.backgroundColor = 'var(--muted)';
                      e.currentTarget.style.color = 'var(--foreground)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentTab !== tab.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--muted-foreground)';
                    }
                  }}
                  aria-label={`Switch to ${tab.label}`}
                >
                  <IconComponent size={16} />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 min-h-[44px] min-w-[44px]"
                  aria-label="Open navigation menu"
                >
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-card border-border">
                <div className="flex flex-col gap-4 mt-6">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Navigation</h2>
                  </div>
                  
                  {navigationTabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left w-full transition-colors min-h-[44px] ${
                          currentTab === tab.id
                            ? "bg-gradient-to-r from-violet-600 to-purple-600 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <IconComponent size={20} />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Right Section - Settings & Controls */}
          <div className="flex items-center gap-2">
            
            {/* Memory Counter */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50">
              <div className="relative" title={wsConnected ? 'Real-time updates active' : 'WebSocket disconnected'}>
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                {wsConnected && <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75"></div>}
              </div>
              <span className="text-sm font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {memoriesCount}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {memoriesCount === 1 ? 'memory' : 'memories'}
              </span>
            </div>
            
            {/* Settings Dropdown */}
            <SettingsDropdown />
            
            {/* Add Memory Button */}
            <Button 
              onClick={onAddMemory}
              className="btn-primary text-xs lg:text-sm px-4 py-2 rounded-lg font-semibold min-h-[44px]"
            >
              <span className="lg:hidden text-lg">+</span>
              <span className="hidden lg:inline font-bold">+ Add Memory</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;