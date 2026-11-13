CREATE TABLE `rate_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `auth_session` ADD `impersonated_by` text;--> statement-breakpoint
ALTER TABLE `auth_user` ADD `role` text;--> statement-breakpoint
ALTER TABLE `auth_user` ADD `banned` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `auth_user` ADD `ban_reason` text;--> statement-breakpoint
ALTER TABLE `auth_user` ADD `ban_expires` integer;