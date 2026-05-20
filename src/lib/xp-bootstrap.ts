import { prisma } from "@/lib/db";
import { awardStatusXp } from "@/lib/xp";

/**
 * Ensure all existing jobs have their XP events recorded.
 * Idempotent: re-running is safe (unique constraint blocks duplicates).
 *
 * For pre-existing data: we award XP for the CURRENT status only —
 * we don't have history to backfill all intermediate transitions,
 * but the current state captures "best progress so far".
 */
export async function bootstrapXp(): Promise<{ added: number }> {
  let added = 0;

  const jobs = await prisma.job.findMany({
    select: { id: true, status: true, role: true, company: true },
  });
  for (const job of jobs) {
    const gained = await awardStatusXp(
      job.id,
      job.status,
      `${job.role} chez ${job.company}`
    );
    if (gained > 0) added += gained;
  }

  return { added };
}
