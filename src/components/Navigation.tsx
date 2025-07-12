import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExportImport } from '@/components/ExportImport';

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
  return (
    <nav className="glass-effect border-b border-gray-700/50 shadow-xl sticky top-0 z-50">
      <div className="space-container">
        <div className="nav-container flex items-center h-25 py-3" 
             style={{paddingLeft: '22px', paddingRight: '16px'}}>
          
          {/* Logo and Title Section */}
          <div className="nav-logo-section flex items-center gap-4 flex-shrink-0" 
               style={{marginLeft: '-119px', marginRight: '80px'}}>
            
            {/* Logo */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg border border-white/10">
                <div className="w-8 h-8 bg-white/90 rounded-sm flex items-center justify-center">
                  <span className="text-indigo-600 font-black text-lg">L</span>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900"></div>
            </div>
            
            {/* Typography */}
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-black text-white tracking-tight leading-none" 
                  style={{fontFamily: 'Inter, system-ui, sans-serif'}}>
                LIKE I SAID
              </h1>
              <div className="text-sm text-gray-300 font-medium tracking-widest mt-0.5" 
                   style={{fontFamily: 'Inter, system-ui, sans-serif'}}>
                MEMORY
              </div>
            </div>
          </div>
          
          {/* Navigation Section - Flex grow to center */}
          <div className="flex-1 flex justify-center ml-8">
            <div className="hidden md:flex items-center gap-4 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg">
              {[
                { id: "dashboard", label: "📊 Dashboard", icon: "📊" },
                { id: "memories", label: "🧠 Memories", icon: "🧠" },
                { id: "relationships", label: "🔗 Relationships", icon: "🔗" },
                { id: "ai", label: "🤖 AI Enhancement", icon: "🤖" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as any)}
                  className={`px-6 py-3 rounded-lg text-base font-semibold transition-all duration-200 ${
                    currentTab === tab.id
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg transform scale-105"
                      : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Right Section - Settings & Controls */}
          <div className="nav-right-container" 
               style={{paddingLeft: '40px', paddingRight: '20px'}}>
            <div className="flex items-center gap-2 lg:gap-3">
              
              {/* Export/Import */}
              <div className="hidden lg:block">
                <ExportImport
                  memories={memories}
                  onImportMemories={onImportMemories}
                />
              </div>
              
              {/* Memory Counter */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                <div className="relative" title={wsConnected ? 'Real-time updates active' : 'WebSocket disconnected'}>
                  <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                  {wsConnected && <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75"></div>}
                </div>
                <span className="text-sm font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  {memoriesCount}
                </span>
                <span className="text-xs lg:text-sm text-gray-300 font-medium">
                  {memoriesCount === 1 ? 'memory' : 'memories'}
                </span>
              </div>
              
              
              {/* Enhance All Button */}
              {llmProvider !== "none" && onEnhanceAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEnhanceAll}
                  disabled={isEnhancing}
                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs lg:text-sm transition-colors rounded-lg"
                >
                  <span className="lg:hidden">{isEnhancing ? "🔄" : "✨"}</span>
                  <span className="hidden lg:inline">{isEnhancing ? "🔄 Enhancing..." : "✨ Enhance All"}</span>
                </Button>
              )}
              
              {/* Add Memory Button */}
              <Button 
                onClick={onAddMemory}
                className="btn-primary text-xs lg:text-sm px-4 py-2 rounded-lg font-semibold"
              >
                <span className="lg:hidden text-lg">+</span>
                <span className="hidden lg:inline font-bold">+ Add Memory</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;