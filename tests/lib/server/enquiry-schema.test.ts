import { describe, expect, it } from "vitest";
import { enquirySchema } from "@/lib/server/enquiry-schema";

const validEnquiry = {
  name: "Example Person",
  email: "person@example.test",
  phone: "+33 (0) 6 12 34 56 78",
  message: "I would like to discuss a website.",
};

describe("enquirySchema", () => {
  it("accepts a valid enquiry with both contact methods", () => {
    expect(enquirySchema.safeParse(validEnquiry).success).toBe(true);
  });

  it("accepts email-only contact", () => {
    expect(
      enquirySchema.safeParse({ ...validEnquiry, phone: "" }).data?.phone,
    ).toBeNull();
  });

  it("accepts phone-only contact", () => {
    const result = enquirySchema.safeParse({ ...validEnquiry, email: "" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeNull();
  });

  it("rejects missing contact methods", () => {
    const result = enquirySchema.safeParse({
      ...validEnquiry,
      email: "",
      phone: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["email"],
          message:
            "Please add a phone number or email address so I know how to get back to you.",
        }),
      );
    }
  });

  it("rejects an empty name", () => {
    expect(enquirySchema.safeParse({ ...validEnquiry, name: "  " }).success).toBe(
      false,
    );
  });

  it("rejects an empty message", () => {
    expect(
      enquirySchema.safeParse({ ...validEnquiry, message: " \n\t " }).success,
    ).toBe(false);
  });

  it("rejects a name longer than 100 characters", () => {
    expect(
      enquirySchema.safeParse({ ...validEnquiry, name: "N".repeat(101) }).success,
    ).toBe(false);
  });

  it("rejects an email longer than 254 characters", () => {
    expect(
      enquirySchema.safeParse({
        ...validEnquiry,
        email: `${"a".repeat(243)}@example.test`,
      }).success,
    ).toBe(false);
  });

  it("rejects a phone number longer than 32 characters", () => {
    expect(
      enquirySchema.safeParse({
        ...validEnquiry,
        phone: `+${"1".repeat(32)}`,
      }).success,
    ).toBe(false);
  });

  it("rejects a message longer than 4000 characters", () => {
    expect(
      enquirySchema.safeParse({
        ...validEnquiry,
        message: "M".repeat(4001),
      }).success,
    ).toBe(false);
  });

  it("trims name, email, phone, and message", () => {
    const result = enquirySchema.safeParse({
      name: "  Example Person  ",
      email: "  person@example.test  ",
      phone: "  +1 (202) 555-0101  ",
      message: "  First line\nSecond line  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Example Person",
        email: "person@example.test",
        phone: "+1 (202) 555-0101",
        message: "First line\nSecond line",
      });
    }
  });

  it("normalizes whitespace-only optional contacts to null", () => {
    const result = enquirySchema.safeParse({
      ...validEnquiry,
      email: "   ",
      phone: "+1 202 555 0101",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeNull();
  });

  it("accepts international phone formatting", () => {
    expect(
      enquirySchema.safeParse({
        ...validEnquiry,
        email: "",
        phone: "+61 (0) 2 1234 5678",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      enquirySchema.safeParse({
        ...validEnquiry,
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid phone characters", () => {
    expect(
      enquirySchema.safeParse({
        ...validEnquiry,
        email: "",
        phone: "+1 202 555 0101 ext 2",
      }).success,
    ).toBe(false);
  });

  it("rejects phone numbers outside the allowed digit count", () => {
    expect(
      enquirySchema.safeParse({
        ...validEnquiry,
        email: "",
        phone: "+123456",
      }).success,
    ).toBe(false);
  });

  it("preserves meaningful internal message newlines", () => {
    const message = "First paragraph.\n\nSecond paragraph.";
    const result = enquirySchema.safeParse({ ...validEnquiry, message });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe(message);
  });
});
