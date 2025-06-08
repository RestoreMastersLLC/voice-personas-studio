'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Search, 
  Mic, 
  Volume2, 
  Menu, 
  X, 
  Globe,
  Settings,
  Home,
  Sliders,
  BarChart3,
  Brain
} from 'lucide-react';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'Overview and analytics'
  },
  {
    name: 'Vimeo Harvester',
    href: '/vimeo-harvester',
    icon: Search,
    description: 'Discover and extract voices from videos'
  },
  {
    name: 'Voice Studio',
    href: '/voice-studio',
    icon: Sliders,
    description: 'Professional voice cloning & testing studio',
    badge: 'New'
  },
  {
    name: 'Quality Dashboard',
    href: '/quality-dashboard',
    icon: BarChart3,
    description: 'Global voice quality monitoring & analysis',
    badge: 'Pro'
  },
  {
    name: 'Learning Monitor',
    href: '/learning-monitor',
    icon: Brain,
    description: 'AI learning system insights & evolution tracking',
    badge: 'AI'
  },
  {
    name: 'Voice Management',
    href: '/voice-management',
    icon: Mic,
    description: 'ElevenLabs integration & voice library'
  },
  {
    name: 'Voice Personas',
    href: '/voice-personas',
    icon: Volume2,
    description: 'Generate content with regional voices'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Configure APIs and preferences'
  }
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [learningStatus, setLearningStatus] = useState<{
    iterations: number;
    isActive: boolean;
  }>({ iterations: 0, isActive: false });
  const pathname = usePathname();

  useEffect(() => {
    // Check learning status on mount and periodically
    checkLearningStatus();
    const interval = setInterval(checkLearningStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkLearningStatus = async () => {
    try {
      const response = await fetch('/api/learning-system/status');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLearningStatus({
            iterations: data.learningData.learningIterations || 0,
            isActive: true
          });
        } else {
          setLearningStatus(prev => ({ ...prev, isActive: false }));
        }
      }
    } catch (error) {
      // Silently fail - learning status is optional
      setLearningStatus(prev => ({ ...prev, isActive: false }));
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-800 lg:bg-gray-900 lg:pt-5 lg:pb-4">
        <div className="flex items-center flex-shrink-0 px-6">
          <div className="flex items-center">
            <Globe className="w-8 h-8 text-purple-500" />
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-white">Voice Personas</h1>
              <p className="text-xs text-gray-400">Studio</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-3 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-900 text-purple-100 shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200 ${
                      isActive ? 'text-purple-300' : 'text-gray-400 group-hover:text-gray-300'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs bg-purple-600 text-purple-100 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 truncate">
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-shrink-0 px-3 py-3 border-t border-gray-800">
          <div className="space-y-2">
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              All systems operational
            </div>
            {learningStatus.isActive && (
              <div className="flex items-center text-xs text-indigo-400">
                <Brain className="h-3 w-3 mr-2" />
                AI Learning: {learningStatus.iterations} iterations
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile menu button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center">
            <Globe className="w-6 h-6 text-purple-500" />
            <span className="ml-2 text-lg font-semibold text-white">Voice Personas</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed top-0 left-0 h-full w-80 bg-gray-900 border-r border-gray-800">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div className="flex items-center">
                  <Globe className="w-6 h-6 text-purple-500" />
                  <span className="ml-2 text-lg font-semibold text-white">Voice Personas</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="mt-4 px-3 space-y-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-900 text-purple-100 shadow-lg'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200 ${
                          isActive ? 'text-purple-300' : 'text-gray-400 group-hover:text-gray-300'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-purple-600 text-purple-100 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 group-hover:text-gray-400 truncate">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 