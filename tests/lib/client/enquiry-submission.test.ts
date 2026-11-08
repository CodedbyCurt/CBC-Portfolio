import { describe, expect, it, vi } from "vitest";
import {
  enquiryFormReducer,
  getEnquiryIdempotencyKey,
  initialEnquiryFormState,
  submitEnquiry,
  type EnquiryPayload,
} from "@/lib/client/enquiry-submission";

const payload: EnquiryPayload = {
  name: "Example Customer",
  email: "customer@example.test",
  phone: "+1 (202) 555-0101",
  message: "I would like to discuss a website.",
};

describe("enquiry form submission", () => {
  it("submits the expected JSON payload and idempotency header", async () => {
    const fetchRequest = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          success: true,
          message: "Thank you. Your enquiry has been received.",
        },
        { status: 202 },
      ),
    );

    await expect(submitEnquiry(payload, "submission-uuid", fetchRequest)).resolves.toEqual({
      type: "accepted",
    });

    expect(fetchRequest).toHaveBeenCalledWith("/api/enquiries", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Idempotency-Key": "submission-uuid",
      },
      body: JSON.stringify(payload),
    });
  });

  it("returns only safe field validation errors", async () => {
    const fetchRequest = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          errors: {
            email: "Enter a valid email address.",
            unexpected: "Do not expose this field.",
          },
        },
        { status: 422 },
      ),
    );

    await expect(submitEnquiry(payload, "submission-uuid", fetchRequest)).resolves.toEqual({
      type: "validation-error",
      fieldErrors: { email: "Enter a valid email address." },
    });
  });

  it.each([409, 500, 503])(
    "treats server response %s as unaccepted and safe to retry",
    async (status) => {
      const fetchRequest = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          { success: false, message: "Private provider detail." },
          { status },
        ),
      );

      await expect(
        submitEnquiry(payload, "submission-uuid", fetchRequest),
      ).resolves.toEqual({ type: "unavailable" });
    },
  );

  it("treats network failures as retryable without exposing exception details", async () => {
    const fetchRequest = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("Private network detail."));

    await expect(
      submitEnquiry(payload, "submission-uuid", fetchRequest),
    ).resolves.toEqual({ type: "unavailable" });
  });

  it("reuses the same idempotency key for retries of the same payload", () => {
    const keys = new Map<string, string>();
    const createUuid = vi
      .fn<() => string>()
      .mockReturnValueOnce("submission-uuid")
      .mockReturnValueOnce("different-submission-uuid");

    expect(getEnquiryIdempotencyKey(payload, keys, createUuid)).toBe(
      "submission-uuid",
    );
    expect(getEnquiryIdempotencyKey(payload, keys, createUuid)).toBe(
      "submission-uuid",
    );
    expect(
      getEnquiryIdempotencyKey(
        { ...payload, message: "A different enquiry." },
        keys,
        createUuid,
      ),
    ).toBe("different-submission-uuid");
    expect(createUuid).toHaveBeenCalledTimes(2);
  });

  it("transitions through loading and accepted states", () => {
    const loading = enquiryFormReducer(initialEnquiryFormState, {
      type: "submitting",
    });
    expect(loading).toMatchObject({
      phase: "submitting",
      message: "Sending your enquiry…",
    });

    expect(enquiryFormReducer(loading, { type: "success" })).toMatchObject({
      phase: "success",
      message: "Thanks—your enquiry has been received. I’ll be in touch.",
      fieldErrors: {},
    });
  });
});
