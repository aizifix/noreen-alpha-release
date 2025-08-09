-- Add payment status to event components
ALTER TABLE `tbl_event_components`
ADD COLUMN `payment_status` ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending' AFTER `is_included`,
ADD COLUMN `payment_date` DATETIME DEFAULT NULL AFTER `payment_status`,
ADD COLUMN `payment_notes` TEXT DEFAULT NULL AFTER `payment_date`;

-- Add index for payment status
CREATE INDEX `idx_event_components_payment_status` ON `tbl_event_components`(`payment_status`);

-- Update the getEventById stored procedure to include payment status info
DROP PROCEDURE IF EXISTS `getEnhancedEventDetails`;

DELIMITER $$
CREATE PROCEDURE `getEnhancedEventDetails`(IN p_event_id INT)
BEGIN
    -- Main event details
    SELECT
        e.*,
        v.venue_title,
        v.venue_name,
        v.venue_location,
        v.venue_contact,
        v.venue_capacity,
        COALESCE(vp.price, v.venue_price) as venue_price,
        CONCAT(u.first_name, ' ', COALESCE(u.middle_name, ''), ' ', u.last_name, ' ', COALESCE(u.suffix, '')) as client_name,
        u.email as client_email,
        u.contact_num as client_contact,
        u.pfp as client_pfp,
        et.event_type_name,
        et.event_type_description,
        p.package_title,
        p.package_description,
        CONCAT(a.first_name, ' ', a.last_name) as admin_name,
        CONCAT(o.first_name, ' ', o.last_name) as organizer_name,
        CONCAT(cb.first_name, ' ', cb.last_name) as created_by_name,
        CONCAT(ub.first_name, ' ', ub.last_name) as updated_by_name,
        pst.schedule_name as payment_schedule_name,
        pst.description as payment_schedule_description,
        pst.installment_count
    FROM tbl_events e
    LEFT JOIN tbl_venues v ON e.venue_id = v.venue_id
    LEFT JOIN tbl_venue_price vp ON v.venue_id = vp.venue_id
        AND vp.is_active = 1
        AND e.guest_count >= vp.min_pax
        AND e.guest_count <= vp.max_pax
    LEFT JOIN tbl_user u ON e.user_id = u.user_id
    LEFT JOIN tbl_event_types et ON e.event_type_id = et.event_type_id
    LEFT JOIN tbl_packages p ON e.package_id = p.package_id
    LEFT JOIN tbl_user a ON e.admin_id = a.user_id
    LEFT JOIN tbl_organizer o ON e.organizer_id = o.organizer_id
    LEFT JOIN tbl_user cb ON e.created_by = cb.user_id
    LEFT JOIN tbl_user ub ON e.updated_by = ub.user_id
    LEFT JOIN tbl_payment_schedule_types pst ON e.payment_schedule_type_id = pst.schedule_type_id
    WHERE e.event_id = p_event_id;

    -- Event components with payment status
    SELECT
        ec.*,
        pc.component_name as original_component_name,
        pc.component_description as original_component_description,
        s.supplier_name,
        s.contact_person
    FROM tbl_event_components ec
    LEFT JOIN tbl_package_components pc ON ec.original_package_component_id = pc.package_component_id
    LEFT JOIN tbl_suppliers s ON ec.supplier_id = s.supplier_id
    WHERE ec.event_id = p_event_id
    ORDER BY ec.display_order;

    -- Payment history
    SELECT * FROM tbl_payments
    WHERE event_id = p_event_id
    ORDER BY payment_date DESC;

    -- Event timeline
    SELECT * FROM tbl_event_timeline
    WHERE event_id = p_event_id
    ORDER BY timeline_date, timeline_time;

    -- Event attachments
    SELECT * FROM tbl_event_attachments
    WHERE event_id = p_event_id
    ORDER BY uploaded_at DESC;

    -- Wedding details if applicable
    SELECT * FROM tbl_wedding_details
    WHERE event_id = p_event_id;

    -- Payment schedule if applicable
    SELECT * FROM tbl_payment_schedule
    WHERE event_id = p_event_id
    ORDER BY due_date;
END$$
DELIMITER ;
