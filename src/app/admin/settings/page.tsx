'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, MapIcon, Code, Tag, Save, Loader2 } from 'lucide-react';

interface AppSettings {
  mapMode: 'demo' | 'live';
  devMode: boolean;
  showBetaBadge: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    mapMode: 'demo',
    devMode: false,
    showBetaBadge: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Configure application behavior and features</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold rounded-lg transition-all shadow-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-4 rounded-lg border ${
          saveMessage.includes('success')
            ? 'bg-green-500/10 border-green-500/20 text-green-500'
            : 'bg-red-500/10 border-red-500/20 text-red-500'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Map Settings */}
      <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <MapIcon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Map Configuration</h2>
            <p className="text-white/60 text-sm">Control map data source and behavior</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Map Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-arctic-900 rounded-lg border border-white/5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-medium">Map Data Mode</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  settings.mapMode === 'live'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {settings.mapMode.toUpperCase()}
                </span>
              </div>
              <p className="text-white/60 text-sm">
                {settings.mapMode === 'demo'
                  ? 'Using simulated aurora data for demonstrations'
                  : 'Using real-time aurora data from NOAA/Space Weather'}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <button
                onClick={() => updateSetting('mapMode', 'demo')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  settings.mapMode === 'demo'
                    ? 'bg-primary text-white'
                    : 'bg-arctic-700 text-white/70 hover:bg-arctic-600'
                }`}
              >
                Demo
              </button>
              <button
                onClick={() => updateSetting('mapMode', 'live')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  settings.mapMode === 'live'
                    ? 'bg-primary text-white'
                    : 'bg-arctic-700 text-white/70 hover:bg-arctic-600'
                }`}
              >
                Live
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Development Settings */}
      <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Code className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Development Mode</h2>
            <p className="text-white/60 text-sm">Enable debugging and development features</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Dev Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-arctic-900 rounded-lg border border-white/5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-medium">Developer Mode</h3>
                {settings.devMode && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-500">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm">
                Shows debug information, console logs, and developer tools
              </p>
              <ul className="mt-2 space-y-1 text-white/50 text-xs">
                <li>• Console logging enabled</li>
                <li>• API response times displayed</li>
                <li>• Component boundaries visible</li>
                <li>• Error details shown</li>
              </ul>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={settings.devMode}
                onChange={(e) => updateSetting('devMode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-arctic-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* UI Settings */}
      <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Tag className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">User Interface</h2>
            <p className="text-white/60 text-sm">Control visible UI elements and badges</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Beta Badge Toggle */}
          <div className="flex items-center justify-between p-4 bg-arctic-900 rounded-lg border border-white/5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-medium">Beta Badge</h3>
                {settings.showBetaBadge && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                    BETA
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm">
                Display beta badge on the homepage to indicate the app is in beta testing
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={settings.showBetaBadge}
                onChange={(e) => updateSetting('showBetaBadge', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-arctic-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <SettingsIcon className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-400 font-medium mb-1">Settings Info</p>
            <p className="text-white/70">
              Changes are applied immediately after saving. Map mode affects all users.
              Development mode only affects admin views. Settings are stored in the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
