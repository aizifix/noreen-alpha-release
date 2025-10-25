# Conceptual Entity Relationship Diagram
## Event Planning System

### Core Entities and Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                USER MANAGEMENT                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   tbl_users     │    │ tbl_user_sessions│    │tbl_system_activity_logs│
│                 │    │                 │    │                 │
│ • user_id (PK)  │◄───┤ • user_id (FK)  │    │ • user_id (FK)  │
│ • user_firstName│    │ • session_id    │    │ • action_type   │
│ • user_lastName │    │ • user_role     │    │ • description   │
│ • user_email    │    │ • login_time    │    │ • metadata      │
│ • user_contact  │    │ • last_activity │    │ • ip_address    │
│ • user_username │    │ • ip_address    │    │ • created_at    │
│ • user_pwd      │    │ • is_active     │    │                 │
│ • user_role     │    │ • logout_time   │    │                 │
│ • account_status│    │                 │    │                 │
│ • is_verified   │    │                 │    │                 │
│ • created_at    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EVENT MANAGEMENT                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   tbl_events    │    │  tbl_event_types   │    │tbl_event_organizer_assignments│
│                 │    │                 │    │                 │
│ • event_id (PK) │◄───┤ • event_type_id │    │ • event_id (FK) │
│ • user_id (FK)  │    │ • event_type_name│    │ • organizer_id  │
│ • admin_id (FK) │    │ • description   │    │ • assigned_by   │
│ • organizer_id  │    │                 │    │ • status        │
│ • event_title   │    │                 │    │ • notes         │
│ • event_theme   │    │                 │    │ • assigned_at   │
│ • event_type_id │    │                 │    │                 │
│ • guest_count   │    │                 │    │                 │
│ • event_date    │    │                 │    │                 │
│ • start_time    │    │                 │    │                 │
│ • end_time      │    │                 │    │                 │
│ • payment_status│    │                 │    │                 │
│ • venue_id (FK) │    │                 │    │                 │
│ • package_id (FK)│   │                 │    │                 │
│ • total_budget  │    │                 │    │                 │
│ • event_status  │    │                 │    │                 │
│ • created_at    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VENUE & PACKAGE MANAGEMENT                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   tbl_venue     │    │  tbl_packages   │    │tbl_package_venues│
│                 │    │                 │    │                 │
│ • venue_id (PK) │    │ • package_id (PK)│   │ • package_id (FK)│
│ • user_id (FK)  │    │ • package_title │    │ • venue_id (FK)  │
│ • venue_title   │    │ • package_price │    │ • created_at  │
│ • venue_owner   │    │ • package_desc   │    │                 │
│ • venue_location│    │ • is_active     │    │                 │
│ • venue_contact │    │ • created_at    │    │                 │
│ • venue_details │    │                 │    │                 │
│ • venue_status  │    │                 │    │                 │
│ • venue_capacity│    │                 │    │                 │
│ • venue_price   │    │                 │    │                 │
│ • venue_type    │    │                 │    │                 │
│ • created_at    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │tbl_package_components│
                    │                 │
                    │ • component_id (PK)│
                    │ • package_id (FK)│
                    │ • component_name │
                    │ • component_desc │
                    │ • supplier_id (FK)│
                    │ • offer_id (FK)  │
                    │ • display_order │
                    │                 │
                    └─────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SUPPLIER MANAGEMENT                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  tbl_suppliers  │    │tbl_supplier_offers│   │tbl_supplier_services│
│                 │    │                 │    │                 │
│ • supplier_id (PK)│   │ • offer_id (PK) │    │ • service_id (PK)│
│ • user_id (FK)  │    │ • supplier_id (FK)│   │ • supplier_id (FK)│
│ • supplier_type │    │ • service_name   │    │ • service_name   │
│ • business_name │    │ • service_desc   │    │ • service_desc   │
│ • contact_number│    │ • price_min      │    │ • price_range    │
│ • contact_email│   │ • price_max      │    │ • is_active      │
│ • contact_person│    │ • is_active      │    │ • created_at     │
│ • business_addr │    │ • created_at    │    │                 │
│ • agreement_signed│   │                 │    │                 │
│ • specialty_category│  │                 │    │                 │
│ • rating_average │    │                 │    │                 │
│ • is_verified   │    │                 │    │                 │
│ • is_active     │    │                 │    │                 │
│ • created_at    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PAYMENT & BOOKING MANAGEMENT                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  tbl_payments   │    │ tbl_bookings    │    │tbl_payment_schedules│
│                 │    │                 │    │                 │
│ • payment_id (PK)│   │ • booking_id (PK)│   │ • schedule_id (PK)│
│ • event_id (FK) │    │ • event_id (FK) │    │ • event_id (FK)  │
│ • client_id (FK)│    │ • client_id (FK)│    │ • payment_type   │
│ • schedule_id (FK)│  │ • booking_date  │    │ • amount         │
│ • payment_method│    │ • booking_time  │    │ • due_date       │
│ • payment_amount│    │ • guest_count   │    │ • status         │
│ • payment_notes │    │ • total_amount  │    │ • created_at     │
│ • payment_status│    │ • booking_status│    │                 │
│ • payment_date  │    │ • special_req   │    │                 │
│ • payment_reference│  │ • created_at    │    │                 │
│ • payment_attachments│                 │    │                 │
│ • created_at    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FEEDBACK & NOTIFICATION SYSTEM                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  tbl_feedback   │    │tbl_notifications │    │tbl_venue_price │
│                 │    │                 │    │                 │
│ • feedback_id (PK)│  │ • notification_id (PK)│ • price_id (PK) │
│ • user_id (FK)  │    │ • user_id (FK)  │    │ • venue_id (FK) │
│ • venue_id (FK) │    │ • event_id (FK) │    │ • venue_price_min│
│ • store_id (FK) │    │ • venue_id (FK) │    │ • venue_price_max│
│ • feedback_rating│   │ • booking_id (FK)│   │ • is_active     │
│ • feedback_text │    │ • notification_message│ • created_at    │
│ • created_at    │    │ • notification_type│  │                 │
│                 │    │ • notification_priority│               │
│                 │    │ • notification_status│               │
│                 │    │ • created_at    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Relationships Summary:

1. **User Management**
   - `tbl_users` (1) ←→ (M) `tbl_user_sessions`
   - `tbl_users` (1) ←→ (M) `tbl_system_activity_logs`

2. **Event Management**
   - `tbl_users` (1) ←→ (M) `tbl_events` (as client/admin/organizer)
   - `tbl_events` (M) ←→ (1) `tbl_event_types`
   - `tbl_events` (M) ←→ (1) `tbl_venue`
   - `tbl_events` (M) ←→ (1) `tbl_packages`
   - `tbl_events` (1) ←→ (M) `tbl_event_organizer_assignments`

3. **Venue & Package Management**
   - `tbl_venue` (M) ←→ (M) `tbl_packages` (through `tbl_package_venues`)
   - `tbl_packages` (1) ←→ (M) `tbl_package_components`
   - `tbl_package_components` (M) ←→ (1) `tbl_suppliers`

4. **Supplier Management**
   - `tbl_users` (1) ←→ (0..1) `tbl_suppliers` (for internal suppliers)
   - `tbl_suppliers` (1) ←→ (M) `tbl_supplier_offers`
   - `tbl_suppliers` (1) ←→ (M) `tbl_supplier_services`
   - `tbl_package_components` (M) ←→ (0..1) `tbl_suppliers`

5. **Payment & Booking Management**
   - `tbl_events` (1) ←→ (M) `tbl_payments`
   - `tbl_events` (1) ←→ (M) `tbl_bookings`
   - `tbl_payments` (M) ←→ (1) `tbl_payment_schedules`

6. **Feedback & Notifications**
   - `tbl_users` (1) ←→ (M) `tbl_feedback`
   - `tbl_users` (1) ←→ (M) `tbl_notifications`
   - `tbl_venue` (1) ←→ (M) `tbl_feedback`
   - `tbl_venue` (1) ←→ (M) `tbl_venue_price`

### User Roles and Permissions:
- **Admin**: Full system access
- **Staff**: Limited access (view/edit events, manage bookings, no admin functions)
- **Organizer**: Event management and client interaction
- **Client**: Event booking and payment
- **Supplier**: Service offering and management

### System Features:
- Multi-role user management
- Event planning and booking
- Venue and package management
- Supplier integration
- Payment processing
- Feedback and rating system
- Notification system
- Activity logging
- Session management
