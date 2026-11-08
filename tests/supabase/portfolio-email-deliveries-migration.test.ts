import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../supabase/migrations/20261108014900_create_portfolio_email_deliveries.sql",
  import.meta.url,
);

describe("portfolio email delivery migration contract", () => {
  it("creates recipient jobs transactionally without copying enquiry content", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    const tableDefinition = sql.match(
      /CREATE TABLE public\.portfolio_email_deliveries \(([\s\S]*?)\n\);/,
    )?.[1];
    const enqueueFunction = sql.match(
      /CREATE FUNCTION public\.enqueue_portfolio_email_deliveries\(\)([\s\S]*?)\$function\$;/,
    )?.[1];

    expect(sql).toContain("\nBEGIN;");
    expect(sql.trimEnd()).toMatch(/COMMIT;$/);
    expect(tableDefinition).toBeDefined();
    expect(tableDefinition).toContain("enquiry_id uuid NOT NULL");
    expect(tableDefinition).toContain("UNIQUE (enquiry_id, recipient_type)");
    expect(tableDefinition).not.toMatch(/^\s*(name|email|phone|message)\s+/m);
    expect(enqueueFunction).toContain("VALUES (NEW.id, 'owner')");
    expect(enqueueFunction).toContain("ON CONFLICT (enquiry_id, recipient_type) DO NOTHING");
    if (!enqueueFunction) throw new Error("Email enqueue function is missing.");

    const ownerInsertIndex = enqueueFunction.indexOf("VALUES (NEW.id, 'owner')");
    const customerConditionIndex = enqueueFunction.indexOf("IF NEW.email IS NOT NULL");
    const customerInsertIndex = enqueueFunction.indexOf("VALUES (NEW.id, 'customer')");
    expect(ownerInsertIndex).toBeGreaterThanOrEqual(0);
    expect(customerConditionIndex).toBeGreaterThan(ownerInsertIndex);
    expect(customerInsertIndex).toBeGreaterThan(customerConditionIndex);
    expect(enqueueFunction).toContain("pg_catalog.btrim(NEW.email) <> ''");
    expect(enqueueFunction).not.toMatch(/NEW\.email\s*~\*?|NEW\.email\s*!~/i);
    expect(enqueueFunction).toMatch(
      /IF NEW\.email IS NOT NULL\s+AND pg_catalog\.btrim\(NEW\.email\) <> ''[\s\S]*?VALUES \(NEW\.id, 'customer'\)/,
    );
    expect(sql).toContain(
      "AFTER INSERT ON public.portfolio_enquiries\nFOR EACH ROW\nEXECUTE FUNCTION public.enqueue_portfolio_email_deliveries()",
    );
  });

  it.each([
    ["a non-empty email", "customer@example.test", true],
    ["NULL", null, false],
    ["an empty email", "", false],
    ["whitespace only", " \t ", false],
  ])("uses the API-validated email presence predicate for %s", async (_label, email, expected) => {
    const sql = await readFile(migrationUrl, "utf8");
    const enqueueFunction = sql.match(
      /CREATE FUNCTION public\.enqueue_portfolio_email_deliveries\(\)([\s\S]*?)\$function\$;/,
    )?.[1];

    expect(enqueueFunction).toBeDefined();
    expect(enqueueFunction).toMatch(
      /IF NEW\.email IS NOT NULL\s+AND pg_catalog\.btrim\(NEW\.email\) <> ''\s+THEN/,
    );
    expect(enqueueFunction).not.toMatch(/NEW\.email\s*~\*?|NEW\.email\s*!~/i);
    expect(email !== null && email.trim() !== "").toBe(expected);
  });

  it("uses isolated statuses, bounded retries, and independent delivery records", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    expect(sql).toContain("CHECK (recipient_type IN ('owner', 'customer'))");
    expect(sql).toContain("CHECK (status IN ('pending', 'sending', 'retry', 'sent', 'failed'))");
    expect(sql).toContain("CHECK (attempt_count BETWEEN 0 AND 5)");
    expect(sql).toContain("AND lease_expires_at IS NOT NULL");
    expect(sql).toContain("AND next_attempt_at IS NOT NULL");
    expect(sql).toContain("AND sent_at IS NOT NULL");
    expect(sql).toContain("2::numeric");
    expect(sql).toContain("(delivery.attempt_count - 1)::numeric");
    expect(sql).toContain("mins => LEAST(");
    expect(sql).toContain("delivery.attempt_count < 5 THEN 'retry'");
    expect(sql).toContain("delivery.attempt_count >= 5");
    expect(sql).toContain("interval '5 minutes'");
  });

  it("claims bounded batches with row locks and returns no recipient or enquiry content", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    const claimFunction = sql.match(
      /CREATE FUNCTION public\.claim_portfolio_email_deliveries\([\s\S]*?\$function\$;/,
    )?.[0];

    expect(claimFunction).toBeDefined();
    expect(claimFunction).toContain("p_batch_size < 1 OR p_batch_size > 100");
    expect(claimFunction).toContain("FOR UPDATE OF delivery SKIP LOCKED");
    expect(claimFunction).toContain("delivery.claim_token");
    expect(claimFunction).not.toMatch(/\b(name|email|phone|message)\b/i);
  });

  it("rejects stale worker updates unless the current unexpired claim token matches", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    const completionFunctions = [
      sql.match(
        /CREATE FUNCTION public\.complete_portfolio_email_delivery\([\s\S]*?\$function\$;/,
      )?.[0],
      sql.match(
        /CREATE FUNCTION public\.retry_portfolio_email_delivery\([\s\S]*?\$function\$;/,
      )?.[0],
      sql.match(
        /CREATE FUNCTION public\.fail_portfolio_email_delivery\([\s\S]*?\$function\$;/,
      )?.[0],
    ];

    for (const functionSql of completionFunctions) {
      expect(functionSql).toBeDefined();
      expect(functionSql).toContain("delivery.status = 'sending'");
      expect(functionSql).toContain("delivery.claim_token = p_claim_token");
      expect(functionSql).toContain(
        "delivery.lease_expires_at > pg_catalog.clock_timestamp()",
      );
      expect(functionSql).toContain("RETURN FOUND");
    }
  });

  it("enables row security and limits table and RPC access to service_role", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    expect(sql).toContain(
      "ALTER TABLE public.portfolio_email_deliveries ENABLE ROW LEVEL SECURITY",
    );
    expect(sql).toContain(
      "FROM PUBLIC, anon, authenticated, service_role;\nGRANT SELECT, INSERT, UPDATE ON TABLE public.portfolio_email_deliveries\n    TO service_role",
    );
    expect(sql).toContain("SET search_path = pg_catalog, public");
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.claim_portfolio_email_deliveries(integer)\n    TO service_role",
    );
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.(?:claim|complete|retry|fail)_portfolio_email_delivery[^;]*\b(?:PUBLIC|anon|authenticated)\b/i);
  });
});
