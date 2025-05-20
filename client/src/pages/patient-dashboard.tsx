import { AppointmentStatusBadge } from '@/components/appointment-status-badge';

// ... existing code ...

// Inside the appointments table cell for status
<td className="py-4 px-4">
  <AppointmentStatusBadge 
    status={appointment.status}
    statusNotes={appointment.statusNotes} 
  />
</td> 