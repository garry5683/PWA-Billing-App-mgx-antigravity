import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Check, 
  Sun, 
  Moon, 
  Leaf, 
  Crown, 
  Flame, 
  Waves, 
  Heart,
  Zap
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const themeIcons = {
  default: Sun,
  green: Leaf,
  purple: Crown,
  orange: Flame,
  teal: Waves,
  dark: Moon,
  rose: Heart,
  indigo: Zap
};

export function ThemeSelector() {
  const { currentTheme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          style={{ 
            borderColor: currentTheme.colors.primary,
            color: currentTheme.colors.primary 
          }}
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Choose Your Theme
          </DialogTitle>
          <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
            Customize the appearance of your billing application
          </p>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {themes.map((theme) => {
            const IconComponent = themeIcons[theme.id as keyof typeof themeIcons] || Sun;
            const isSelected = currentTheme.id === theme.id;
            
            return (
              <Card 
                key={theme.id}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  isSelected ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{ 
                  borderColor: theme.colors.primary,
                  ...(isSelected && { '--tw-ring-color': theme.colors.primary } as React.CSSProperties)
                }}
                onClick={() => handleThemeChange(theme.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <IconComponent 
                        className="h-4 w-4" 
                        style={{ color: theme.colors.primary }}
                      />
                      <span>{theme.name}</span>
                    </div>
                    {isSelected && (
                      <Check 
                        className="h-4 w-4" 
                        style={{ color: theme.colors.success }}
                      />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Theme Preview */}
                  <div 
                    className="rounded-lg p-3 mb-3"
                    style={{ backgroundColor: theme.colors.surface }}
                  >
                    <div className="space-y-2">
                      {/* Header bar */}
                      <div 
                        className="h-2 rounded"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      
                      {/* Content bars */}
                      <div className="flex gap-1">
                        <div 
                          className="h-1 flex-1 rounded"
                          style={{ backgroundColor: theme.colors.text, opacity: 0.3 }}
                        />
                        <div 
                          className="h-1 flex-1 rounded"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                      </div>
                      
                      {/* Button preview */}
                      <div className="flex gap-1">
                        <div 
                          className="h-4 w-8 rounded text-xs flex items-center justify-center"
                          style={{ 
                            backgroundColor: theme.colors.primary,
                            color: theme.id === 'dark' ? theme.colors.text : '#ffffff'
                          }}
                        >
                          ●
                        </div>
                        <div 
                          className="h-4 w-8 rounded border"
                          style={{ 
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.background
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Color Palette */}
                  <div className="flex gap-1 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme.colors.primary }}
                      title="Primary"
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme.colors.accent }}
                      title="Accent"
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme.colors.success }}
                      title="Success"
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme.colors.warning }}
                      title="Warning"
                    />
                  </div>
                  
                  {isSelected && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ 
                        backgroundColor: theme.colors.primary,
                        color: theme.id === 'dark' ? theme.colors.text : '#ffffff'
                      }}
                    >
                      Current Theme
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div
          className="mt-6 p-4 rounded-lg"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h4
            className="font-medium mb-2 flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <Palette className="h-4 w-4" />
            Theme Features
          </h4>
          <ul className="text-sm space-y-1" style={{ color: 'var(--color-textSecondary)' }}>
            <li>• Automatic theme persistence across sessions</li>
            <li>• Responsive design that adapts to all themes</li>
            <li>• Optimized for both light and dark preferences</li>
            <li>• Professional color schemes for business use</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}