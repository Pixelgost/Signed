import { Button } from './ui/button';
import { Home, User, Search, Briefcase } from 'lucide-react';
import { Badge } from './ui/badge';

interface NavigationBarProps {
  activeTab: 'home' | 'search' | 'profile';
  onTabChange: (tab: 'home' | 'search' | 'profile') => void;
  matchCount?: number;
}

export function NavigationBar({ 
  activeTab, 
  onTabChange, 
  matchCount = 2 
}: NavigationBarProps) {
  const tabs = [
    {
      id: 'home' as const,
      icon: Home,
      label: 'Home'
    },
    {
      id: 'search' as const,
      icon: Search,
      label: 'Search'
    },
    {
      id: 'profile' as const,
      icon: User,
      label: 'Profile'
    }
  ];

  return (
    <nav className="w-full bg-background border-t border-border px-4 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center space-y-1 p-2 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
                {tab.badgeCount && tab.badgeCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {tab.badgeCount > 9 ? '9+' : tab.badgeCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}