ALTER TABLE `vehicles` ADD `pickupZipcode` varchar(10);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `pickupCity` varchar(128);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `pickupState` varchar(2);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `deliveryZipcode` varchar(10);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `deliveryCity` varchar(128);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `deliveryState` varchar(2);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `distanceMiles` int;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `logisticsPriorityColor` enum('green','yellow','orange','red');