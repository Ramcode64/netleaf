import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, scheduledCrawls } from "@/lib/db";
import { ScheduleList, type ScheduleRow } from "@/components/dashboard/ScheduleList";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const db = getDb();

  const rows = await db
    .select({
      id: scheduledCrawls.id,
      name: scheduledCrawls.name,
      cronExpression: scheduledCrawls.cronExpression,
      nextRunAt: scheduledCrawls.nextRunAt,
      isActive: scheduledCrawls.isActive,
    })
    .from(scheduledCrawls)
    .where(eq(scheduledCrawls.userId, userId))
    .orderBy(desc(scheduledCrawls.createdAt));

  const schedules: ScheduleRow[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    cronExpression: s.cronExpression,
    nextRunAt: s.nextRunAt ? (s.nextRunAt as Date).toISOString() : null,
    isActive: s.isActive,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schedules</h1>
        <p className="mt-1 text-sm text-ink-100">Recurring crawls running on a cron schedule.</p>
      </div>
      <ScheduleList schedules={schedules} />
    </div>
  );
}
