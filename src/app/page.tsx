'use client';

import { Navigation } from '@/components/shared/Navigation';
import { 
  Search, 
  Mic, 
  Volume2, 
  FileVideo, 
  Globe, 
  ArrowRight,
  Zap
} from 'lucide-react';
import Link from 'next/link';

const stats = [
  {
    name: 'Total Videos Analyzed',
    value: '23',
    icon: FileVideo,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
  },
  {
    name: 'Voices Cloned',
    value: '8',
    icon: Mic,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
  },
  {
    name: 'Audio Generated',
    value: '156',
    icon: Volume2,
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
  },
  {
    name: 'Regions Covered',
    value: '12',
    icon: Globe,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
  },
];

const quickActions = [
  {
    name: 'Discover Videos',
    description: 'Find and analyze videos from your Vimeo library',
    href: '/vimeo-harvester',
    icon: Search,
    color: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    name: 'Clone Voice',
    description: 'Create new AI voices from audio samples',
    href: '/voice-management',
    icon: Mic,
    color: 'bg-purple-600 hover:bg-purple-700',
  },
  {
    name: 'Generate Content',
    description: 'Create sales content with regional voices',
    href: '/voice-personas',
    icon: Volume2,
    color: 'bg-green-600 hover:bg-green-700',
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'voice_cloned',
    title: 'Sarah Belle voice cloned successfully',
    description: 'Southern accent from sales training video',
    time: '2 hours ago',
    icon: Mic,
    color: 'text-purple-400',
  },
  {
    id: 2,
    type: 'audio_generated',
    title: 'Generated 15 audio files',
    description: 'British accent persona for UK campaign',
    time: '4 hours ago',
    icon: Volume2,
    color: 'text-green-400',
  },
  {
    id: 3,
    type: 'video_analyzed',
    title: 'Analyzed new training video',
    description: 'Detected 2 speakers with high quality scores',
    time: '1 day ago',
    icon: FileVideo,
    color: 'text-blue-400',
  },
];

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-gray-900">
      <Navigation />
      
      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        <div className="px-4 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Voice Personas Studio
            </h1>
                         <p className="text-gray-400 text-lg">
               Transform your team&apos;s regional voices into scalable AI-powered sales tools
             </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-400">{stat.name}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.name}
                    href={action.href}
                    className="group"
                  >
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-all duration-200 group-hover:scale-105">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-lg ${action.color} transition-colors`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{action.name}</h3>
                      <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                        {action.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity & System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="p-2 bg-gray-700 rounded-lg">
                        <Icon className={`w-4 h-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{activity.title}</p>
                        <p className="text-sm text-gray-400">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-gray-300">Vimeo API</span>
                  </div>
                  <span className="text-green-400 text-sm">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-gray-300">ElevenLabs API</span>
                  </div>
                  <span className="text-green-400 text-sm">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                    <span className="text-gray-300">Voice Processing</span>
                  </div>
                  <span className="text-yellow-400 text-sm">Maintenance</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-gray-300">Audio Generation</span>
                  </div>
                  <span className="text-green-400 text-sm">Operational</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">API Usage (Monthly)</span>
                  <span className="text-white">45,230 / 100,000</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Overview */}
          <div className="mt-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-700/30 p-8">
            <div className="flex items-center mb-6">
              <Zap className="w-8 h-8 text-purple-400 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-white">Complete Voice Platform</h2>
                <p className="text-purple-200">Discover • Clone • Generate • Deploy</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <Search className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Voice Discovery</h3>
                  <p className="text-sm text-purple-200">Extract regional accents from your video library</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <Mic className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">AI Voice Cloning</h3>
                  <p className="text-sm text-purple-200">Create production-ready voice models</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <Volume2 className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Content Generation</h3>
                  <p className="text-sm text-purple-200">Scale personalized sales content globally</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
