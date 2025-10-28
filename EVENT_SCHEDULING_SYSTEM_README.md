# Event Scheduling System

A modular, customizable Event Scheduling System that allows admins to manage event schedules parsed from comma-separated inclusion descriptions and supports full CRUD operations with date constraints, checklists, and printable views.

## 🎯 Features

- **Modular Architecture**: Clean separation of concerns with dedicated `schedule.php` file
- **Database-Driven**: Uses `tbl_event_schedule` table for persistent storage
- **CRUD Operations**: Full Create, Read, Update, Delete functionality
- **Date Constraints**: Restricts scheduling to valid date ranges (today to event date)
- **Role-Based Access**: Different permissions for admins vs organizers
- **Printable Views**: Clean, professional schedule printouts
- **Package Integration**: Auto-seed schedules from package inclusions
- **Custom Components**: Add custom schedule items beyond package inclusions

## 🗄️ Database Schema

### Table: `tbl_event_schedule`

```sql
CREATE TABLE `tbl_event_schedule` (
  `schedule_id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `inclusion_name` VARCHAR(255) NULL,
  `component_name` VARCHAR(255) NOT NULL,
  `is_custom` TINYINT(1) DEFAULT 0 COMMENT '0 = parsed from inclusion_description, 1 = manually added free-text',
  `scheduled_date` DATE NOT NULL,
  `scheduled_time` TIME NOT NULL,
  `status` ENUM('Pending','Done','Delivered','Cancelled') DEFAULT 'Pending',
  `assigned_organizer_id` INT NULL,
  `remarks` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `tbl_events`(`event_id`) ON DELETE CASCADE,
  INDEX `idx_event_id` (`event_id`),
  INDEX `idx_scheduled_date` (`scheduled_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 📁 File Structure

```
event-planning-system/
├── app/api/
│   ├── admin.php                    # Main admin API (modified)
│   ├── schedule.php                 # Schedule management API
│   ├── create_schedule_table.sql   # Database table creation script
│   └── test_schedule_system.php     # Test script
└── app/(authenticated)/admin/events/[id]/
    ├── page.tsx                     # Main event page (modified)
    └── schedule-component.tsx       # Enhanced schedule component
```

## 🔧 Installation

### 1. Database Setup

Run the SQL script to create the schedule table:

```bash
mysql -u your_username -p your_database < create_schedule_table.sql
```

### 2. API Integration

The `admin.php` file has been modified to include the schedule system:

```php
case "schedules":
    // Include schedule.php for schedule management
    include_once 'schedule.php';
    break;
```

### 3. Frontend Integration

The enhanced `EventScheduleTab` component has been created and integrated into the admin event page.

## 🚀 Usage

### Admin Features

1. **Seed Schedule**: Automatically create schedule items from package inclusions
2. **Add Custom Items**: Create custom schedule components
3. **Edit Schedule**: Modify dates, times, and details
4. **Delete Items**: Remove unwanted schedule items
5. **Print Schedule**: Generate printable schedule views
6. **Date Restrictions**: Automatic validation (today to event date)

### Organizer Features

1. **View Schedule**: Read-only access to schedule
2. **Update Status**: Mark items as Done/Delivered
3. **View Progress**: Track completion status

## 📋 API Endpoints

### Schedule Operations

| Operation | Method | Parameters | Description |
|-----------|--------|------------|-------------|
| `schedules` | POST | `subaction=seed` | Seed schedule from package inclusions |
| `schedules` | POST | `subaction=create` | Add new schedule item |
| `schedules` | POST | `subaction=update` | Update existing schedule item |
| `schedules` | POST | `subaction=toggle_status` | Change item status |
| `schedules` | POST | `subaction=delete` | Delete schedule item |
| `schedules` | GET | `subaction=get` | Fetch all schedule items |

### Example API Calls

#### Seed Schedule
```javascript
const response = await axios.post('/api/admin', {
  operation: 'schedules',
  subaction: 'seed',
  event_id: 123
});
```

#### Add Custom Item
```javascript
const response = await axios.post('/api/admin', {
  operation: 'schedules',
  subaction: 'create',
  event_id: 123,
  component_name: 'Photography Setup',
  inclusion_name: 'Photo & Video',
  scheduled_date: '2025-10-28',
  scheduled_time: '09:00',
  remarks: 'Early morning setup required',
  is_custom: 1
});
```

#### Update Status
```javascript
const response = await axios.post('/api/admin', {
  operation: 'schedules',
  subaction: 'toggle_status',
  schedule_id: 456,
  status: 'Done'
});
```

## 🎨 Frontend Components

### EventScheduleTab Component

The enhanced schedule component provides:

- **Progress Tracking**: Visual progress bar showing completion status
- **Date Grouping**: Schedule items organized by date
- **Status Management**: Color-coded status indicators
- **Inline Editing**: Edit items directly in the interface
- **Modal Forms**: Clean forms for adding new items
- **Print Support**: Professional print layouts

### Key Features

```typescript
// Date restrictions
const getMinDate = () => new Date().toISOString().split('T')[0];
const getMaxDate = () => event.event_date;

// Status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Done': return 'text-green-600 bg-green-100';
    case 'Delivered': return 'text-blue-600 bg-blue-100';
    case 'Cancelled': return 'text-red-600 bg-red-100';
    default: return 'text-yellow-600 bg-yellow-100';
  }
};
```

## 🔒 Security & Permissions

### Role-Based Access Control

- **Admins**: Full CRUD access to all schedule operations
- **Organizers**: Read-only access with status update permissions
- **Date Validation**: Server-side validation prevents invalid date ranges
- **SQL Injection Protection**: Prepared statements for all database operations

### Validation Rules

1. **Date Range**: Must be between today and event date
2. **Required Fields**: Component name, date, and time are mandatory
3. **Status Values**: Only valid enum values accepted
4. **Event Ownership**: Users can only access their assigned events

## 🧪 Testing

Run the test script to verify installation:

```bash
php test_schedule_system.php
```

The test script checks:
- ✅ Database table existence and structure
- ✅ API file availability
- ✅ Admin.php integration
- ✅ API endpoint functionality
- ✅ Frontend component files

## 📱 User Interface

### Schedule Checklist Layout

```
📅 October 28, 2025
- SDE (4:00 PM) ✅ Done
- Photobooth (5:00 PM) ⏳ Pending
- Drone Shots (6:00 PM) ⏳ Pending

📅 October 29, 2025
- Catering Setup (9:00 AM) ✅ Done
- Ceremony (2:00 PM) ⏳ Pending
```

### Admin Controls

- **Seed from Package**: Auto-populate from package inclusions
- **Add Custom Item**: Create new schedule components
- **Edit Mode**: Toggle between view and edit modes
- **Print Schedule**: Generate printable version
- **Date Picker**: Restricted to valid date ranges

## 🔄 Migration from Old System

The new system replaces the old approach of storing schedule data in `additional_notes`. To migrate existing data:

1. **Backup**: Export existing schedule data from `additional_notes`
2. **Seed**: Use the "Seed from Package" feature to populate new table
3. **Verify**: Check that all components are properly scheduled
4. **Clean**: Remove old schedule data from `additional_notes`

## 🚨 Troubleshooting

### Common Issues

1. **Table Not Found**: Run `create_schedule_table.sql`
2. **API Errors**: Check `schedule.php` file permissions
3. **Date Validation**: Ensure event dates are properly set
4. **Permission Errors**: Verify user roles and event assignments

### Debug Mode

Enable debug logging in `schedule.php`:

```php
error_log("Schedule operation: " . $subaction);
error_log("Schedule data: " . json_encode($_POST));
```

## 📈 Future Enhancements

- **Recurring Events**: Support for recurring schedule patterns
- **Time Zones**: Multi-timezone support
- **Notifications**: Automated reminders for upcoming tasks
- **Analytics**: Schedule performance metrics
- **Templates**: Pre-defined schedule templates
- **Mobile App**: Dedicated mobile interface for organizers

## 📞 Support

For issues or questions:
1. Check the test script output
2. Review API response logs
3. Verify database table structure
4. Test with sample data

---

**Version**: 1.0.0
**Last Updated**: October 2025
**Compatibility**: PHP 8.0+, MySQL 5.7+, Next.js 13+
