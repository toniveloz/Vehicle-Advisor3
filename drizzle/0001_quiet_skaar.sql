CREATE TABLE `carfaxAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`viabilityScore` int,
	`recommendation` enum('strong_buy','buy','caution','avoid'),
	`recommendationLabel` varchar(255),
	`marketValueEstimate` varchar(255),
	`residualValueEstimate` varchar(255),
	`accidentHistory` text,
	`numberOfOwners` text,
	`maintenanceSummary` text,
	`odometerAssessment` text,
	`titleAssessment` text,
	`profitabilityAnalysis` text,
	`purchaseJustification` text,
	`riskFactorsJson` text,
	`rawExtractedJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carfaxAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carfaxSummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`cleanTitle` int DEFAULT 0,
	`accidentsCount` int,
	`previousOwners` int,
	`serviceHistory` int DEFAULT 0,
	`airbags` int DEFAULT 0,
	`odometerIssues` int DEFAULT 0,
	`structuralDamage` int DEFAULT 0,
	`floodDamage` int DEFAULT 0,
	`totalLoss` int DEFAULT 0,
	`lemonHistory` int DEFAULT 0,
	`recordCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carfaxSummaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicleDamages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`type` varchar(128) NOT NULL,
	`photoUrl` text,
	`photoKey` text,
	`description` text,
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicleDamages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicleParts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`link` text,
	`estimatedCost` decimal(10,2),
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicleParts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehiclePhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`photoKey` text NOT NULL,
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehiclePhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vin` varchar(50) NOT NULL,
	`year` varchar(4) NOT NULL,
	`brand` varchar(128) NOT NULL,
	`model` varchar(128) NOT NULL,
	`trim` varchar(128),
	`mileage` varchar(50),
	`askingPrice` decimal(12,2),
	`marketPrice` decimal(12,2),
	`notes` text,
	`titleType` enum('clean','salvage','rebuilt','branded') DEFAULT 'clean',
	`viabilityScore` int,
	`riskLevel` enum('low','medium','high') DEFAULT 'low',
	`resaleScore` int,
	`carfaxPdfUrl` text,
	`carfaxPdfKey` text,
	`analysisStatus` enum('not_started','analyzing','completed','failed') NOT NULL DEFAULT 'not_started',
	`analysisError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_vin_unique` UNIQUE(`vin`)
);
