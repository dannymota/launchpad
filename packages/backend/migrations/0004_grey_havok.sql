CREATE TABLE `ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`month` text NOT NULL,
	`model` text NOT NULL,
	`micros` integer NOT NULL,
	`state` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_usage_month_user_idx` ON `ai_usage` (`month`,`user_id`);