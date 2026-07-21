-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `publicId` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_publicId_key`(`publicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes for User
CREATE INDEX `User_phone_idx` ON `User`(`phone`);
CREATE INDEX `User_role_idx` ON `User`(`role`);

-- CreateTable
CREATE TABLE `Application` (
    `id` VARCHAR(191) NOT NULL,
    `applicantName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `nid` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `capitalAmount` DOUBLE NULL,
    `durationMonths` INTEGER NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `nomineeName` VARCHAR(191) NULL,
    `relation` VARCHAR(191) NULL,
    `fatherName` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `referredBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes for Application
CREATE INDEX `Application_phone_idx` ON `Application`(`phone`);
CREATE INDEX `Application_status_idx` ON `Application`(`status`);
CREATE INDEX `Application_purpose_idx` ON `Application`(`purpose`);
CREATE INDEX `Application_referredBy_idx` ON `Application`(`referredBy`);

-- CreateTable
CREATE TABLE `Member` (
    `memberId` VARCHAR(191) NOT NULL,
    `publicId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `nid` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'INVESTOR',
    `capitalInvested` DOUBLE NOT NULL,
    `termMonths` INTEGER NOT NULL,
    `monthlyProfit` DOUBLE NOT NULL,
    `monthlyCapitalRefund` DOUBLE NOT NULL,
    `monthlyTotalPayout` DOUBLE NOT NULL,
    `joinDate` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `nomineeName` VARCHAR(191) NULL,
    `relation` VARCHAR(191) NULL,
    `fatherName` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `referredBy` VARCHAR(191) NULL,
    `buyerReferredBy` VARCHAR(191) NULL,
    `buyerParent` VARCHAR(191) NULL,
    `buyerLeft` VARCHAR(191) NULL,
    `buyerRight` VARCHAR(191) NULL,
    `investorParent` VARCHAR(191) NULL,
    `investorLeft` VARCHAR(191) NULL,
    `investorRight` VARCHAR(191) NULL,

    UNIQUE INDEX `Member_publicId_key`(`publicId`),
    PRIMARY KEY (`memberId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes for Member
CREATE INDEX `Member_phone_idx` ON `Member`(`phone`);
CREATE INDEX `Member_referredBy_idx` ON `Member`(`referredBy`);
CREATE INDEX `Member_buyerReferredBy_idx` ON `Member`(`buyerReferredBy`);
CREATE INDEX `Member_buyerParent_idx` ON `Member`(`buyerParent`);
CREATE INDEX `Member_investorParent_idx` ON `Member`(`investorParent`);
CREATE INDEX `Member_status_idx` ON `Member`(`status`);

-- CreateTable
CREATE TABLE `Payout` (
    `id` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `memberName` VARCHAR(191) NOT NULL,
    `monthNumber` INTEGER NOT NULL,
    `dueDate` VARCHAR(191) NOT NULL,
    `profitAmount` DOUBLE NOT NULL,
    `capitalRefund` DOUBLE NOT NULL,
    `totalPayout` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `method` VARCHAR(191) NOT NULL DEFAULT 'Bank Wire / bKash',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes for Payout
CREATE INDEX `Payout_memberId_idx` ON `Payout`(`memberId`);
CREATE INDEX `Payout_status_idx` ON `Payout`(`status`);
CREATE INDEX `Payout_memberId_monthNumber_idx` ON `Payout`(`memberId`, `monthNumber`);

-- CreateTable
CREATE TABLE `Product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NOT NULL DEFAULT 'PLAN-10',
    `category` VARCHAR(191) NOT NULL DEFAULT 'Consumer Goods',
    `price` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `imageUrls` VARCHAR(191) NOT NULL DEFAULT '[]',
    `stockStatus` VARCHAR(191) NOT NULL DEFAULT 'IN_STOCK',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inquiry` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'UNREAD',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `operator` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `productId` INTEGER NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes for Order
CREATE INDEX `Order_username_idx` ON `Order`(`username`);
CREATE INDEX `Order_status_idx` ON `Order`(`status`);
CREATE INDEX `Order_createdAt_idx` ON `Order`(`createdAt`);

-- CreateTable
CREATE TABLE `Wallet` (
    `username` VARCHAR(191) NOT NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`username`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes for Transaction
CREATE INDEX `Transaction_username_idx` ON `Transaction`(`username`);
CREATE INDEX `Transaction_type_idx` ON `Transaction`(`type`);
CREATE INDEX `Transaction_date_idx` ON `Transaction`(`date`);

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'SYSTEM',
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isRead` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes for Notification
CREATE INDEX `Notification_username_idx` ON `Notification`(`username`);
CREATE INDEX `Notification_timestamp_idx` ON `Notification`(`timestamp`);

-- CreateTable
CREATE TABLE `Withdrawal` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes for Withdrawal
CREATE INDEX `Withdrawal_username_idx` ON `Withdrawal`(`username`);
CREATE INDEX `Withdrawal_status_idx` ON `Withdrawal`(`status`);
CREATE INDEX `Withdrawal_requestedAt_idx` ON `Withdrawal`(`requestedAt`);

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_username_fkey` FOREIGN KEY (`username`) REFERENCES `Wallet`(`username`) ON DELETE CASCADE ON UPDATE CASCADE;

