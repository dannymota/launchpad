ALTER TABLE `assistant_grants` ADD `client_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `assistant_grants` ADD `provider_grant_id` text;--> statement-breakpoint
ALTER TABLE `assistant_grants` ADD `revoked_reason` text;--> statement-breakpoint
CREATE INDEX `assistant_grants_provider_grant_idx` ON `assistant_grants` (`provider_grant_id`);