import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

type Notification = {
  id: number;
  user_id: number;
  appointment_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const hasActiveAppointmentsRef = useRef<boolean>(false);
  const visibilityChangeListenerAdded = useRef<boolean>(false);
  
  // Get whether the user has any active appointments today
  const { data: appointments } = useQuery({
    queryKey: ['/api/patient/appointments'],
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes - we don't need to check this frequently
    select: (data: any) => {
      if (!data) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter for today's active appointments
      return data.filter((apt: any) => {
        const aptDate = new Date(apt.date);
        return aptDate >= today && 
               aptDate < tomorrow && 
               ['scheduled', 'start', 'hold', 'pause'].includes(apt.status);
      });
    }
  });

  // Update ref after data changes
  useEffect(() => {
    hasActiveAppointmentsRef.current = Boolean(appointments && appointments.length > 0);
  }, [appointments]);
  
  // Determine optimal polling interval based on document visibility and appointment status
  const getPollingInterval = () => {
    // If tab is hidden, poll less frequently
    if (typeof document !== 'undefined' && document.hidden) {
      return hasActiveAppointmentsRef.current ? 30000 : 60000; // 30s or 60s if hidden
    }
    
    // If tab is visible
    return hasActiveAppointmentsRef.current ? 15000 : 30000; // 15s or 30s if visible
  };
  
  // Fetch notifications with adaptive polling
  const { 
    data: notifications = [],
    refetch,
    error: notificationError
  } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/notifications');
        return res.json();
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return []; // Return empty array on error rather than failing
      }
    },
    refetchInterval: getPollingInterval(),
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff
  });
  
  // Update polling interval when visibility changes
  useEffect(() => {
    if (typeof document !== 'undefined' && !visibilityChangeListenerAdded.current) {
      const handleVisibilityChange = () => {
        // Manually refetch when tab becomes visible again
        if (!document.hidden) {
          refetch();
        }
        
        // Invalidate to update refetch interval
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityChangeListenerAdded.current = true;
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        visibilityChangeListenerAdded.current = false;
      };
    }
  }, [queryClient, refetch]);
  
  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const res = await apiRequest('PATCH', `/api/notifications/${id}/read`);
        return res.json();
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to mark notification as read:', error);
    }
  });
  
  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiRequest('POST', '/api/notifications/read-all');
        return res.json();
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Failed to mark all notifications as read:', error);
    }
  });
  
  // Play notification sound when new notifications arrive
  useEffect(() => {
    if (notifications.length > 0 && !isOpen) {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    }
  }, [notifications.length, isOpen]);
  
  // Request browser notification permission (if not granted)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);
  
  // Show browser notification when a new notification arrives
  useEffect(() => {
    if (
      typeof window !== 'undefined' && 
      'Notification' in window && 
      Notification.permission === 'granted' && 
      notifications.length > 0 && 
      !isOpen && 
      document.visibilityState === 'hidden'
    ) {
      const latest = notifications[0];
      new Notification(latest.title, {
        body: latest.message,
        icon: '/favicon.ico'
      });
    }
  }, [notifications, isOpen]);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
              variant="destructive"
            >
              {notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto p-0">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-medium">Notifications</h3>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="divide-y">
          {notificationError ? (
            <div className="p-4 text-center text-rose-500">
              Failed to load notifications. Please try again.
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No new notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className="p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => markAsReadMutation.mutate(notification.id)}
              >
                <div className="font-medium mb-1">{notification.title}</div>
                <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}



