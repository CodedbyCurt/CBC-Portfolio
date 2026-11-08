import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ marker: "mock-supabase-client" })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabase.createClient,
}));

const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function loadAdminClientModule() {
  vi.resetModules();
  return import("@/lib/server/supabase-admin");
}

describe("Supabase admin client", () => {
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    supabase.createClient.mockClear();
  });

  it("does not construct the client or make requests when the module is imported", async () => {
    process.env.SUPABASE_URL = "https://portfolio.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    await loadAdminClientModule();

    expect(supabase.createClient).not.toHaveBeenCalled();
  });

  it("constructs one reusable client only when requested", async () => {
    process.env.SUPABASE_URL = "https://portfolio.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const { getSupabaseAdminClient } = await loadAdminClientModule();

    expect(supabase.createClient).not.toHaveBeenCalled();
    const first = getSupabaseAdminClient();
    const second = getSupabaseAdminClient();

    expect(first).toBe(second);
    expect(supabase.createClient).toHaveBeenCalledOnce();
    expect(supabase.createClient).toHaveBeenCalledWith(
      "https://portfolio.example.test",
      "test-service-role-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });

  it("retains the server-only module boundary", async () => {
    const source = await readFile(
      new URL("../../../lib/server/supabase-admin.ts", import.meta.url),
      "utf8",
    );

    expect(source.startsWith('import "server-only";')).toBe(true);
  });
});
