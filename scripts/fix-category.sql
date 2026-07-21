-- PLAN-10 BD: Fix incorrect member categories
-- Run this to fix members that were incorrectly set to BUYER by the previous migration

-- Step 1: See current state before fixing
SELECT category, COUNT(*) AS count FROM `Member` GROUP BY category;

-- Step 2: Fix based on actual data
-- Investors: have capital invested OR are in the investor binary tree
UPDATE `Member`
SET `category` = 'INVESTOR'
WHERE `category` != 'INVESTOR'
  AND (`capitalInvested` > 0 OR `investorParent` IS NOT NULL);

-- Buyers: have orders OR are in the buyer binary tree
-- (We only fix those not already classified as INVESTOR or BOTH)
UPDATE `Member` m
SET `category` = 'BUYER'
WHERE m.`category` IS NULL OR m.`category` = ''
   OR (m.`category` NOT IN ('INVESTOR', 'BOTH')
       AND (m.`buyerParent` IS NOT NULL
            OR EXISTS (SELECT 1 FROM `Order` o WHERE o.`username` = m.`memberId`)));

-- Step 3: Set BOTH for members who qualify as both investor AND buyer
UPDATE `Member` m
SET `category` = 'BOTH'
WHERE (`capitalInvested` > 0 OR `investorParent` IS NOT NULL)
  AND (m.`buyerParent` IS NOT NULL
       OR EXISTS (SELECT 1 FROM `Order` o WHERE o.`username` = m.`memberId`));

-- Step 4: Any remaining uncategorized → default to INVESTOR (if they have investment data) else BUYER
UPDATE `Member`
SET `category` = 'INVESTOR'
WHERE `category` IS NULL OR `category` = '' OR `category` NOT IN ('INVESTOR', 'BUYER', 'BOTH');

-- Step 5: Show the fixed counts
SELECT '--- After fix ---' AS status;
SELECT category, COUNT(*) AS count FROM `Member` GROUP BY category;
