-- Check Event #270 component_description data
SELECT
    ec.component_id,
    ec.component_name,
    ec.component_description,
    ec.original_package_component_id
FROM tbl_event_components ec
WHERE ec.event_id = 270
ORDER BY ec.display_order;
