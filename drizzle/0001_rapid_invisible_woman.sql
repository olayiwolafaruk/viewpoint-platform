CREATE TABLE `auth_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer NOT NULL,
	CONSTRAINT "auth_rate_attempts_check" CHECK("auth_rate_limits"."attempts" >= 1)
);
