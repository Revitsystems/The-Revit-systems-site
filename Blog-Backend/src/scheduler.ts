import cron from "node-cron";
import { publishDueScheduledPosts } from "@/models/postModel.js";

// ============================================
// POST SCHEDULER
//
// Runs every minute and checks for posts whose
// scheduled_date has passed. Any that are found
// are flipped to "published" in a single UPDATE
// and logged to stdout.
//
// Started once from app.ts on server boot.
// The task is non-blocking — if the DB call
// fails the error is caught and logged so the
// cron process itself never crashes.
// ============================================

export const startScheduler = (): void => {
  // "* * * * *" = every minute
  cron.schedule("* * * * *", async () => {
    try {
      const published = await publishDueScheduledPosts();

      if (published.length === 0) {
        // Nothing due — stay quiet to keep logs clean
        return;
      }

      // Log each post that was published
      console.log(
        `[Scheduler] ${new Date().toISOString()} — Published ${
          published.length
        } scheduled post(s):`
      );
      published.forEach((post) => {
        console.log(`  • [${post.id}] "${post.title}"`);
      });
    } catch (error) {
      // Log but don't rethrow — a DB hiccup should never kill the cron task
      console.error(
        `[Scheduler] ${new Date().toISOString()} — Error publishing scheduled posts:`,
        error
      );
    }
  });

  console.log("[Scheduler] Post scheduler started — checking every minute.");
};
