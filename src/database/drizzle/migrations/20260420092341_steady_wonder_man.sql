DROP INDEX "youtube_ml_scores_video_id_idx";--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "is_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "youtube_daily_analytics_channel_date_uq" ON "youtube_daily_analytics" USING btree ("channel_id","analytics_date");--> statement-breakpoint
CREATE UNIQUE INDEX "youtube_ml_scores_video_id_uq" ON "youtube_ml_scores" USING btree ("video_id");