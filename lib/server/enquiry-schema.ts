import "server-only";

import { z } from "zod";

const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || null : value ?? null),
  z
    .string()
    .max(254, "Email address must be 254 characters or fewer.")
    .email("Enter a valid email address.")
    .nullable(),
);

const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || null : value ?? null),
  z
    .string()
    .max(32, "Phone number must be 32 characters or fewer.")
    .regex(
      /^\+?[0-9 ().-]+$/,
      "Use only digits, spaces, parentheses, periods, hyphens, and an optional leading +.",
    )
    .refine(
      (value) => {
        const digitCount = value.replace(/\D/g, "").length;
        return digitCount >= 7 && digitCount <= 15;
      },
      "Phone number must contain between 7 and 15 digits.",
    )
    .nullable(),
);

export const enquirySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(100, "Name must be 100 characters or fewer."),
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
    message: z
      .string()
      .trim()
      .min(1, "Message is required.")
      .max(4000, "Message must be 4000 characters or fewer."),
  })
  .superRefine((enquiry, context) => {
    if (enquiry.email === null && enquiry.phone === null) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Please add a phone number or email address so I know how to get back to you.",
      });
    }
  });

export type ValidatedEnquiry = z.infer<typeof enquirySchema>;
