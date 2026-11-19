-- Projects get an optional start date so the timeline can draw a bar (start → target).
ALTER TABLE "Project" ADD COLUMN "startDate" TIMESTAMP(3);