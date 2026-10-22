export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: "low" | "medium" | "high";
  description: string;
  createdAt: string;
}
