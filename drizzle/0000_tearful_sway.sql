CREATE TABLE `menus` (
	`id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`parent_id` char(36) NOT NULL DEFAULT '0',
	`menu_name` varchar(64) NOT NULL,
	`menu_type` tinyint NOT NULL,
	`path` varchar(255) NOT NULL DEFAULT '',
	`component` varchar(255) NOT NULL DEFAULT '',
	`icon` varchar(64) NOT NULL DEFAULT '',
	`redirect` varchar(255) NOT NULL DEFAULT '',
	`permission_code` varchar(128) NOT NULL DEFAULT '',
	`visible` tinyint NOT NULL DEFAULT 1,
	`keep_alive` tinyint NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`permission_name` varchar(64) NOT NULL,
	`permission_code` varchar(128) NOT NULL,
	`permission_type` tinyint NOT NULL DEFAULT 1,
	`resource` varchar(255) NOT NULL DEFAULT '',
	`method` varchar(16) NOT NULL DEFAULT '',
	`status` tinyint NOT NULL DEFAULT 1,
	`remark` varchar(255) NOT NULL DEFAULT '',
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_permission_code_unique` UNIQUE(`permission_code`)
);
--> statement-breakpoint
CREATE TABLE `role_menu` (
	`role_id` char(36) NOT NULL,
	`menu_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_menu_role_id_menu_id_pk` PRIMARY KEY(`role_id`,`menu_id`)
);
--> statement-breakpoint
CREATE TABLE `role_permission` (
	`role_id` char(36) NOT NULL,
	`permission_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permission_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`role_name` varchar(64) NOT NULL,
	`role_code` varchar(64) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`remark` varchar(255) NOT NULL DEFAULT '',
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_role_code_unique` UNIQUE(`role_code`)
);
--> statement-breakpoint
CREATE TABLE `user_role` (
	`user_id` char(36) NOT NULL,
	`role_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_role_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`username` varchar(64) NOT NULL,
	`nickname` varchar(64) NOT NULL,
	`password` varchar(255) NOT NULL,
	`email` varchar(128) NOT NULL,
	`phone` varchar(20) NOT NULL DEFAULT '',
	`avatar` varchar(255) NOT NULL DEFAULT '',
	`status` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `role_menu` ADD CONSTRAINT `role_menu_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_menu` ADD CONSTRAINT `role_menu_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_parent_id` ON `menus` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `menus` (`status`);--> statement-breakpoint
CREATE INDEX `idx_permission_type` ON `permissions` (`permission_type`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `permissions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_role_id` ON `role_menu` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_menu_id` ON `role_menu` (`menu_id`);--> statement-breakpoint
CREATE INDEX `idx_role_id` ON `role_permission` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_id` ON `role_permission` (`permission_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `roles` (`status`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `user_role` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_role_id` ON `user_role` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `users` (`status`);