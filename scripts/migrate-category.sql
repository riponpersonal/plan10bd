-- PLAN-10 BD: Database Migration Script
-- Run this ONCE on your cPanel MySQL database to add the account category feature.
-- These ALTER statements are safe to re-run (they use IF NOT EXISTS / IF EXISTS).

-- ==========================================================
-- 1. Add category column to Member table
-- ==========================================================
SET @dbname = DATABASE();
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Member' AND COLUMN_NAME = 'category');
SET @sql = IF(@exists = 0,
    'ALTER TABLE `Member` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT \'INVESTOR\' AFTER `nid`',
    'SELECT "Column category already exists in Member" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================================
-- 2. Add publicId column to User table (if missing)
-- ==========================================================
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'User' AND COLUMN_NAME = 'publicId');
SET @sql = IF(@exists = 0,
    'ALTER TABLE `User` ADD COLUMN `publicId` VARCHAR(191) NULL AFTER `username`, ADD UNIQUE INDEX `User_publicId_key`(`publicId`)',
    'SELECT "Column publicId already exists in User" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================================
-- 3. Add publicId column to Member table (if missing)
-- ==========================================================
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Member' AND COLUMN_NAME = 'publicId');
SET @sql = IF(@exists = 0,
    'ALTER TABLE `Member` ADD COLUMN `publicId` VARCHAR(191) NULL AFTER `memberId`, ADD UNIQUE INDEX `Member_publicId_key`(`publicId`)',
    'SELECT "Column publicId already exists in Member" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================================
-- 4. Add performance indexes (safe to re-run)
-- ==========================================================

-- User indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'User' AND INDEX_NAME = 'User_phone_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `User_phone_idx` ON `User`(`phone`)', 'SELECT "Index User_phone_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'User' AND INDEX_NAME = 'User_role_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `User_role_idx` ON `User`(`role`)', 'SELECT "Index User_role_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Application indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Application' AND INDEX_NAME = 'Application_phone_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Application_phone_idx` ON `Application`(`phone`)', 'SELECT "Index Application_phone_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Application' AND INDEX_NAME = 'Application_status_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Application_status_idx` ON `Application`(`status`)', 'SELECT "Index Application_status_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Application' AND INDEX_NAME = 'Application_purpose_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Application_purpose_idx` ON `Application`(`purpose`)', 'SELECT "Index Application_purpose_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Application' AND INDEX_NAME = 'Application_referredBy_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Application_referredBy_idx` ON `Application`(`referredBy`)', 'SELECT "Index Application_referredBy_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Member indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Member' AND INDEX_NAME = 'Member_phone_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Member_phone_idx` ON `Member`(`phone`)', 'SELECT "Index Member_phone_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Member' AND INDEX_NAME = 'Member_referredBy_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Member_referredBy_idx` ON `Member`(`referredBy`)', 'SELECT "Index Member_referredBy_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Member' AND INDEX_NAME = 'Member_buyerReferredBy_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Member_buyerReferredBy_idx` ON `Member`(`buyerReferredBy`)', 'SELECT "Index Member_buyerReferredBy_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Member' AND INDEX_NAME = 'Member_buyerParent_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Member_buyerParent_idx` ON `Member`(`buyerParent`)', 'SELECT "Index Member_buyerParent_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Member' AND INDEX_NAME = 'Member_investorParent_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Member_investorParent_idx` ON `Member`(`investorParent`)', 'SELECT "Index Member_investorParent_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Member' AND INDEX_NAME = 'Member_status_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Member_status_idx` ON `Member`(`status`)', 'SELECT "Index Member_status_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Payout indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Payout' AND INDEX_NAME = 'Payout_memberId_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Payout_memberId_idx` ON `Payout`(`memberId`)', 'SELECT "Index Payout_memberId_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Payout' AND INDEX_NAME = 'Payout_status_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Payout_status_idx` ON `Payout`(`status`)', 'SELECT "Index Payout_status_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Payout' AND INDEX_NAME = 'Payout_memberId_monthNumber_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Payout_memberId_monthNumber_idx` ON `Payout`(`memberId`, `monthNumber`)', 'SELECT "Index Payout_memberId_monthNumber_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Order indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Order' AND INDEX_NAME = 'Order_username_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Order_username_idx` ON `Order`(`username`)', 'SELECT "Index Order_username_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Order' AND INDEX_NAME = 'Order_status_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Order_status_idx` ON `Order`(`status`)', 'SELECT "Index Order_status_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Order' AND INDEX_NAME = 'Order_createdAt_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Order_createdAt_idx` ON `Order`(`createdAt`)', 'SELECT "Index Order_createdAt_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Transaction indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Transaction' AND INDEX_NAME = 'Transaction_username_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Transaction_username_idx` ON `Transaction`(`username`)', 'SELECT "Index Transaction_username_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Transaction' AND INDEX_NAME = 'Transaction_type_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Transaction_type_idx` ON `Transaction`(`type`)', 'SELECT "Index Transaction_type_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Transaction' AND INDEX_NAME = 'Transaction_date_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Transaction_date_idx` ON `Transaction`(`date`)', 'SELECT "Index Transaction_date_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Notification indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Notification' AND INDEX_NAME = 'Notification_username_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Notification_username_idx` ON `Notification`(`username`)', 'SELECT "Index Notification_username_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Notification' AND INDEX_NAME = 'Notification_timestamp_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Notification_timestamp_idx` ON `Notification`(`timestamp`)', 'SELECT "Index Notification_timestamp_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Withdrawal indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Withdrawal' AND INDEX_NAME = 'Withdrawal_username_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Withdrawal_username_idx` ON `Withdrawal`(`username`)', 'SELECT "Index Withdrawal_username_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Withdrawal' AND INDEX_NAME = 'Withdrawal_status_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Withdrawal_status_idx` ON `Withdrawal`(`status`)', 'SELECT "Index Withdrawal_status_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Withdrawal' AND INDEX_NAME = 'Withdrawal_requestedAt_idx');
SET @sql = IF(@exists = 0, 'CREATE INDEX `Withdrawal_requestedAt_idx` ON `Withdrawal`(`requestedAt`)', 'SELECT "Index Withdrawal_requestedAt_idx already exists" AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================================
-- 5. Update existing legacy members with a category based on their data
--    (Only runs if they currently have NULL or empty category)
-- ==========================================================
UPDATE `Member`
SET `category` = 'INVESTOR'
WHERE (`category` IS NULL OR `category` = '')
  AND (`capitalInvested` > 0 OR `investorParent` IS NOT NULL);

UPDATE `Member`
SET `category` = 'BUYER'
WHERE (`category` IS NULL OR `category` = '')
  AND (`capitalInvested` = 0 OR `capitalInvested` IS NULL)
  AND (`investorParent` IS NULL);

-- For any remaining members without a category, default to INVESTOR
UPDATE `Member`
SET `category` = 'INVESTOR'
WHERE `category` IS NULL OR `category` = '';

SELECT 'Migration complete!' AS status;
