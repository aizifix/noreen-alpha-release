-- Add customized_package column to tbl_packages
ALTER TABLE tbl_packages
ADD COLUMN customized_package TINYINT(1) DEFAULT 0 COMMENT '1 if this is a customized package created from event components, 0 for regular packages';

-- Update existing packages to mark them as not customized
UPDATE tbl_packages SET customized_package = 0 WHERE customized_package IS NULL;
