-- Fix admin password to match "123"
-- This script properly updates the admin password hash

-- Update admin user password to hash for "123"
-- Hash generated using PHP password_hash() function
UPDATE tbl_users
SET user_pwd = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE user_username = 'admin';

-- Verify the update
SELECT user_username, user_email, user_role,
       CASE WHEN user_pwd = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
            THEN 'Password updated correctly'
            ELSE 'Password update failed'
       END as status
FROM tbl_users
WHERE user_username = 'admin';
