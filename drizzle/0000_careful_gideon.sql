CREATE TABLE `airtime_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`viewer_id` text NOT NULL,
	`amount_kobo` integer NOT NULL,
	`phone_number` text NOT NULL,
	`network` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`viewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "redemption_amount_check" CHECK(typeof("airtime_redemptions"."amount_kobo") = 'integer' and "airtime_redemptions"."amount_kobo" between 1 and 9007199254740991),
	CONSTRAINT "redemption_status_check" CHECK("airtime_redemptions"."status" in ('pending','approved','rejected','fulfilled'))
);
--> statement-breakpoint
CREATE INDEX `redemption_queue_idx` ON `airtime_redemptions` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `app_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`viewer_id` text NOT NULL,
	`screenshot_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`reviewed_at` integer,
	`reviewed_by` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`viewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "app_submission_status_check" CHECK("app_submissions"."status" in ('pending','approved','rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_submission_campaign_viewer_unique` ON `app_submissions` (`campaign_id`,`viewer_id`);--> statement-breakpoint
CREATE INDEX `app_submission_queue_idx` ON `app_submissions` (`campaign_id`,`status`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auth_session_expiry_check" CHECK("auth_sessions"."expires_at" > "auth_sessions"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_unique` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`advertiser_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`target_country` text DEFAULT 'NG' NOT NULL,
	`duration_seconds` integer DEFAULT 60 NOT NULL,
	`cooldown_seconds` integer DEFAULT 86400 NOT NULL,
	`price_per_action_kobo` integer NOT NULL,
	`viewer_reward_kobo` integer NOT NULL,
	`platform_fee_kobo` integer NOT NULL,
	`remaining_budget_kobo` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`advertiser_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "campaign_kind_check" CHECK("campaigns"."kind" in ('article','app_install')),
	CONSTRAINT "campaign_status_check" CHECK("campaigns"."status" in ('draft','pending_review','active','paused','cancelled')),
	CONSTRAINT "campaign_country_check" CHECK("campaigns"."target_country" glob '[A-Z][A-Z]'),
	CONSTRAINT "campaign_duration_check" CHECK(typeof("campaigns"."duration_seconds") = 'integer' and "campaigns"."duration_seconds" >= 60),
	CONSTRAINT "campaign_cooldown_check" CHECK(typeof("campaigns"."cooldown_seconds") = 'integer' and "campaigns"."cooldown_seconds" >= 0),
	CONSTRAINT "campaign_price_check" CHECK(typeof("campaigns"."price_per_action_kobo") = 'integer' and typeof("campaigns"."viewer_reward_kobo") = 'integer' and typeof("campaigns"."platform_fee_kobo") = 'integer' and "campaigns"."price_per_action_kobo" between 1 and 9007199254740991 and "campaigns"."viewer_reward_kobo" > 0 and "campaigns"."platform_fee_kobo" >= 0 and "campaigns"."viewer_reward_kobo" + "campaigns"."platform_fee_kobo" = "campaigns"."price_per_action_kobo" and ("campaigns"."kind" != 'app_install' or "campaigns"."price_per_action_kobo" >= 1000)),
	CONSTRAINT "campaign_budget_check" CHECK(typeof("campaigns"."remaining_budget_kobo") = 'integer' and "campaigns"."remaining_budget_kobo" between 0 and 9007199254740991)
);
--> statement-breakpoint
CREATE INDEX `campaigns_owner_idx` ON `campaigns` (`advertiser_id`);--> statement-breakpoint
CREATE INDEX `campaigns_feed_idx` ON `campaigns` (`status`,`kind`,`target_country`);--> statement-breakpoint
CREATE TABLE `deposits` (
	`id` text PRIMARY KEY NOT NULL,
	`advertiser_id` text NOT NULL,
	`reference` text NOT NULL,
	`transaction_id` text,
	`amount_kobo` integer NOT NULL,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`credited_at` integer,
	FOREIGN KEY (`advertiser_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "deposit_amount_check" CHECK(typeof("deposits"."amount_kobo") = 'integer' and "deposits"."amount_kobo" between 1 and 9007199254740991),
	CONSTRAINT "deposit_currency_check" CHECK("deposits"."currency" = 'NGN'),
	CONSTRAINT "deposit_status_check" CHECK("deposits"."status" in ('pending','succeeded','failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deposit_reference_unique` ON `deposits` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `deposit_transaction_unique` ON `deposits` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `feed_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`feed_url` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`last_fetched_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "feed_status_check" CHECK("feed_sources"."status" in ('pending_review','active','paused'))
);
--> statement-breakpoint
CREATE INDEX `feeds_campaign_idx` ON `feed_sources` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`feed_id` text,
	`canonical_url` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`image_url` text,
	`category` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`feed_id`) REFERENCES `feed_sources`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "posts_status_check" CHECK("posts"."status" in ('pending_review','active','removed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_campaign_url_unique` ON `posts` (`campaign_id`,`canonical_url`);--> statement-breakpoint
CREATE INDEX `posts_public_idx` ON `posts` (`status`,`category`);--> statement-breakpoint
CREATE TABLE `task_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`task_session_id` text NOT NULL,
	`viewer_id` text NOT NULL,
	`post_id` text NOT NULL,
	`price_kobo` integer NOT NULL,
	`viewer_reward_kobo` integer NOT NULL,
	`platform_fee_kobo` integer NOT NULL,
	`claimed_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`task_session_id`) REFERENCES `task_sessions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`viewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "claim_amount_check" CHECK(typeof("task_claims"."price_kobo") = 'integer' and typeof("task_claims"."viewer_reward_kobo") = 'integer' and typeof("task_claims"."platform_fee_kobo") = 'integer' and "task_claims"."price_kobo" between 1 and 9007199254740991 and "task_claims"."viewer_reward_kobo" > 0 and "task_claims"."platform_fee_kobo" >= 0 and "task_claims"."viewer_reward_kobo" + "task_claims"."platform_fee_kobo" = "task_claims"."price_kobo")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claim_session_unique` ON `task_claims` (`task_session_id`);--> statement-breakpoint
CREATE INDEX `claim_cooldown_idx` ON `task_claims` (`viewer_id`,`post_id`,`claimed_at`);--> statement-breakpoint
CREATE TABLE `task_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`viewer_id` text NOT NULL,
	`post_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`start_country` text NOT NULL,
	`start_ip` text NOT NULL,
	FOREIGN KEY (`viewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_expiry_check" CHECK("task_sessions"."expires_at" > "task_sessions"."started_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_token_unique` ON `task_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `task_viewer_post_idx` ON `task_sessions` (`viewer_id`,`post_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`wallet_balance_kobo` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" in ('viewer','advertiser','admin')),
	CONSTRAINT "users_status_check" CHECK("users"."status" in ('active','suspended')),
	CONSTRAINT "users_balance_check" CHECK(typeof("users"."wallet_balance_kobo") = 'integer' and "users"."wallet_balance_kobo" between 0 and 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `wallet_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_kobo` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ledger_kind_check" CHECK("wallet_ledger"."kind" in ('deposit_credit','campaign_funding','campaign_reallocation','task_reward','install_reward','redemption_reserve','redemption_refund')),
	CONSTRAINT "ledger_amount_check" CHECK(typeof("wallet_ledger"."amount_kobo") = 'integer' and "wallet_ledger"."amount_kobo" between -9007199254740991 and 9007199254740991 and "wallet_ledger"."amount_kobo" != 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_idempotency_unique` ON `wallet_ledger` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `ledger_user_idx` ON `wallet_ledger` (`user_id`,`created_at`);