CREATE TABLE `audit_logs` (
	`id` char(36) NOT NULL,
	`user_id` char(36),
	`username` varchar(64) NOT NULL DEFAULT '',
	`action` varchar(160) NOT NULL,
	`method` varchar(16) NOT NULL,
	`path` varchar(255) NOT NULL,
	`resource_id` char(36),
	`status` int NOT NULL,
	`ip` varchar(64) NOT NULL DEFAULT '',
	`user_agent` varchar(512) NOT NULL DEFAULT '',
	`request_id` varchar(64) NOT NULL DEFAULT '',
	`duration_ms` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `audit_logs` (`created_at`);