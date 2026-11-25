CREATE TABLE "service_notes" (
	"service" varchar(255) PRIMARY KEY NOT NULL,
	"notes" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
