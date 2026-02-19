import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <Badge 
      variant={isOnline ? "default" : "destructive"} 
      className="flex items-center gap-1 text-xs"
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline Mode
        </>
      )}
    </Badge>
  );
}