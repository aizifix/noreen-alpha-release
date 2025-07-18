-- Migration to add supplier support to event components
-- This adds supplier_id and offer_id fields to tbl_event_components

ALTER TABLE `tbl_event_components`
ADD COLUMN `supplier_id` int(11) DEFAULT NULL COMMENT 'Reference to supplier if this is a supplier component' AFTER `original_package_component_id`,
ADD COLUMN `offer_id` int(11) DEFAULT NULL COMMENT 'Reference to supplier offer if this is from a specific offer' AFTER `supplier_id`;

-- Add foreign key constraints
ALTER TABLE `tbl_event_components`
ADD CONSTRAINT `fk_event_components_supplier`
FOREIGN KEY (`supplier_id`) REFERENCES `tbl_suppliers`(`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tbl_event_components`
ADD CONSTRAINT `fk_event_components_offer`
FOREIGN KEY (`offer_id`) REFERENCES `tbl_supplier_offers`(`offer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for better performance
CREATE INDEX `idx_event_components_supplier` ON `tbl_event_components`(`supplier_id`);
CREATE INDEX `idx_event_components_offer` ON `tbl_event_components`(`offer_id`);
