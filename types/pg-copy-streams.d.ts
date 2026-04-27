declare module "pg-copy-streams" {
  import type { Submittable } from "pg";
  export function from(statement: string): Submittable;
}
