import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run once daily at 6 AM UTC to expire old plan requests (3 business days)
crons.daily(
  "expire old plan requests",
  { hourUTC: 6, minuteUTC: 0 },
  internal.users.expireOldPlanRequests,
);

export default crons;
