// src/components/theme/ThemeCustomizer.tsx
import { useState, useSyncExternalStore } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

const subscribeToNothing = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface ThemeCustomizerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ThemeCustomizer({
  open,
  onOpenChange,
}: ThemeCustomizerProps) {
  const {
    theme,
    setPrimaryColor,
    setFont,
    setBorderRadius,
    toggleDarkMode,
    availableColors,
    availableFonts,
    isDarkMode,
  } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot,
  );
  const isOpen = open ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next);
    } else {
      setInternalOpen(next);
    }
  };

  if (!mounted) {
    return <div className="fixed bottom-6 right-6 h-14 w-14" />;
  }

  return (
    <>
      <button
        onClick={() => setOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary-500 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label={isOpen ? 'Close theme customizer' : 'Open theme customizer'}
        aria-expanded={isOpen}
      >
        <span className="text-2xl" aria-hidden="true">🎨</span>
      </button>

      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-80 transition-all duration-300',
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
        aria-hidden={!isOpen}
      >
        <Card className="border border-gray-200 shadow-2xl dark:border-gray-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Theme Customizer
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close theme customizer"
              tabIndex={isOpen ? 0 : -1}
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Primary Color
              </label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      theme.primaryColor === color &&
                        'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800',
                    )}
                    style={{
                      backgroundColor: {
                        blue: '#3b82f6',
                        purple: '#a855f7',
                        green: '#22c55e',
                        red: '#ef4444',
                        orange: '#f97316',
                        amber: '#f59e0b',
                      }[color],
                    }}
                    onClick={() => setPrimaryColor(color)}
                    title={color}
                    aria-label={`Set primary color to ${color}`}
                    tabIndex={isOpen ? 0 : -1}
                  />
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="theme-font-family"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Font Family
              </label>
              <select
                id="theme-font-family"
                value={theme.fontFamily}
                onChange={(event) => setFont(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                tabIndex={isOpen ? 0 : -1}
              >
                {availableFonts.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="theme-border-radius"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Border Radius: {theme.borderRadius}
              </label>
              <input
                id="theme-border-radius"
                type="range"
                min="0"
                max="24"
                step="2"
                value={parseFloat(theme.borderRadius) * 16}
                onChange={(event) => setBorderRadius(`${Number(event.target.value) / 16}rem`)}
                className="w-full accent-primary-500"
                tabIndex={isOpen ? 0 : -1}
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0</span>
                <span>1.5rem</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dark Mode
              </span>
              <button
                onClick={toggleDarkMode}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                  isDarkMode ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600',
                )}
                role="switch"
                aria-checked={isDarkMode}
                tabIndex={isOpen ? 0 : -1}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    isDarkMode ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">Preview</p>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" tabIndex={isOpen ? 0 : -1}>Primary</Button>
                <Button variant="secondary" size="sm" tabIndex={isOpen ? 0 : -1}>Secondary</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
