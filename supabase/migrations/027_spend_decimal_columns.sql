-- Change est_impressions and est_reach from bigint to numeric
-- so Snowflake decimal values (e.g. 4496.42) are stored as-is.
ALTER TABLE ad_spend_estimates
  ALTER COLUMN est_impressions TYPE numeric(14,2) USING est_impressions::numeric(14,2),
  ALTER COLUMN est_reach       TYPE numeric(14,2) USING est_reach::numeric(14,2);
