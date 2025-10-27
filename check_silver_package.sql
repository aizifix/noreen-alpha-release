-- Check Silver Debut Package components_list data
SELECT
    pi.inclusion_id,
    pi.inclusion_name,
    pi.components_list,
    pi.inclusion_price,
    pi.package_id,
    p.package_name
FROM tbl_package_inclusions pi
JOIN tbl_packages p ON pi.package_id = p.package_id
WHERE p.package_name LIKE '%Silver%' OR p.package_name LIKE '%Debut%'
ORDER BY pi.display_order;

-- Also check if there are any components_list entries that are not empty
SELECT
    COUNT(*) as total_inclusions,
    COUNT(CASE WHEN components_list IS NOT NULL AND components_list != '' THEN 1 END) as non_empty_components_list,
    COUNT(CASE WHEN components_list IS NULL OR components_list = '' THEN 1 END) as empty_components_list
FROM tbl_package_inclusions pi
JOIN tbl_packages p ON pi.package_id = p.package_id
WHERE p.package_name LIKE '%Silver%' OR p.package_name LIKE '%Debut%';
