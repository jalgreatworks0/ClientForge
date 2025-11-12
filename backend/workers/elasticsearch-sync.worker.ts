import { Client } from "@elastic/elasticsearch";
import { logger } from "@utils/logging/logger";

const es = new Client({ node: process.env.ELASTICSEARCH_URL ?? "http://localhost:9200" });

export interface SyncJob {
  index: string;
  action: "index" | "update" | "delete";
  id: string;
  body?: Record<string, any>;
}

export async function runSyncJob(job: SyncJob): Promise<void> {
  try {
    switch (job.action) {
      case "index":
        await es.index({ index: job.index, id: job.id, body: job.body });
        break;
      case "update":
        await es.update({ index: job.index, id: job.id, body: { doc: job.body } });
        break;
      case "delete":
        await es.delete({ index: job.index, id: job.id });
        break;
    }
    logger.info(`[ES] ${job.action.toUpperCase()} ${job.index}/${job.id}`);
  } catch (err) {
    logger.error(`[ES] ${job.action} failed`, err);
  }
}
