CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(180) NOT NULL,
	`unitPriceMinor` int NOT NULL,
	`quantity` int NOT NULL,
	`totalMinor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`description` text,
	`logoUrl` text,
	`status` enum('active','pending','suspended') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `stores_ownerId_unique` UNIQUE(`ownerId`),
	CONSTRAINT `stores_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `customerId` int;--> statement-breakpoint
ALTER TABLE `products` ADD `storeId` int;