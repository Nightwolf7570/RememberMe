'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

export default function SettingsPage() {
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedLargeText = localStorage.getItem('memory_assistant_large_text') === 'true';
    const savedHighContrast = localStorage.getItem('memory_assistant_high_contrast') === 'true';
    setLargeText(savedLargeText);
    setHighContrast(savedHighContrast);
    applySettings(savedLargeText, savedHighContrast);
  }, []);

  const applySettings = (large: boolean, contrast: boolean) => {
    const html = document.documentElement;
    if (large) {
      html.classList.add('large-text');
    } else {
      html.classList.remove('large-text');
    }
    if (contrast) {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }
  };

  const handleLargeTextToggle = (enabled: boolean) => {
    setLargeText(enabled);
    localStorage.setItem('memory_assistant_large_text', enabled.toString());
    applySettings(enabled, highContrast);
  };

  const handleHighContrastToggle = (enabled: boolean) => {
    setHighContrast(enabled);
    localStorage.setItem('memory_assistant_high_contrast', enabled.toString());
    applySettings(largeText, enabled);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Accessibility Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                <div>
                  <h3 className="text-xl font-medium text-gray-900 mb-1">
                    Large Text Mode
                  </h3>
                  <p className="text-gray-600">
                    Increase all text sizes by 150% for easier reading
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={largeText}
                    onChange={(e) => handleLargeTextToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                <div>
                  <h3 className="text-xl font-medium text-gray-900 mb-1">
                    High Contrast Mode
                  </h3>
                  <p className="text-gray-600">
                    Increase contrast for better visibility
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => handleHighContrastToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              About
            </h2>
            <p className="text-gray-700 mb-2">
              <strong>RememberMe</strong> helps you remember people and conversations.
            </p>
            <p className="text-gray-700">
              Version 1.0.0
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

