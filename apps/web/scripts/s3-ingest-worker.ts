import { runS3IngestWorker } from "../src/workers/s3-ingest-worker";

runS3IngestWorker().catch((error) => {
  console.error("S3 ingest worker crashed:", error);
  process.exit(1);
});
