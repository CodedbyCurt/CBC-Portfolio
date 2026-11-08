import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../supabase/migrations/20261108184100_add_portfolio_enquiry_rate_limit.sql",
  import.meta.url,
);

describe("portfolio enquiry rate-limit migration contract", () => {
  it("uses a private fingerprint table with bounded request counters", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    expect(sql).toContain("\nBEGIN;");
    expect(sql.trimEnd()).toMatch(/COMMIT;$/);
    expect(sql).toContain("CREATE TABLE public.portfolio_enquiry_rate_limits");
    expect(sql).toContain("client_fingerprint text PRIMARY KEY");
    expect(sql).toContain("client_fingerprint ~ '^[0-9a-f]{64}$'");
    expect(sql).toContain("request_count BETWEEN 1 AND 6");
    expect(sql).toContain(
      "ALTER TABLE public.portfolio_enquiry_rate_limits ENABLE ROW LEVEL SECURITY",
    );
    expect(sql).toContain(
      "FROM PUBLIC, anon, authenticated, service_role;",
    );
    expect(sql).toContain(
      "CREATE FUNCTION public.consume_portfolio_enquiry_rate_limit",
    );
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = pg_catalog, public");
    expect(sql).toContain("ON CONFLICT (client_fingerprint) DO UPDATE");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("hashtextextended(p_client_fingerprint, 0)");
    expect(sql).toContain("LEAST(rate_limit.request_count + 1, 6)");
    expect(sql).toContain("v_request_count <= 5");
    expect(sql).toContain("date_part('epoch', v_now) / 900");
    expect(sql).toContain("interval '15 minutes'");
    expect(sql).toContain("window_started_at < v_now - interval '24 hours'");
    expect(sql).toContain("LIMIT 100");
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(sql).not.toMatch(/\b(?:email|phone|name|message|inet)\b/i);
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.consume_portfolio_enquiry_rate_limit(text)\n    TO service_role",
    );
    expect(sql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.consume_portfolio_enquiry_rate_limit[^;]*\b(?:PUBLIC|anon|authenticated)\b/i,
    );
  });
});
