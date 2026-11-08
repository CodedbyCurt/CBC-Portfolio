export type EnquiryField = "name" | "email" | "phone" | "message";

export type EnquiryPayload = Record<EnquiryField, string>;

export type EnquiryFormState = {
  phase: "idle" | "submitting" | "success" | "error";
  message: string;
  fieldErrors: Partial<Record<EnquiryField, string>>;
};

export type EnquiryFormAction =
  | { type: "submitting" }
  | { type: "success" }
  | { type: "validation-error"; fieldErrors: Partial<Record<EnquiryField, string>> }
  | { type: "error"; message: string }
  | { type: "field-changed"; field: EnquiryField }
  | { type: "reset" };

export const initialEnquiryFormState: EnquiryFormState = {
  phase: "idle",
  message: "No pressure—just a clear recommendation and quote.",
  fieldErrors: {},
};

export function enquiryFormReducer(
  state: EnquiryFormState,
  action: EnquiryFormAction,
): EnquiryFormState {
  switch (action.type) {
    case "submitting":
      return {
        ...state,
        phase: "submitting",
        message: "Sending your enquiry…",
      };
    case "success":
      return {
        phase: "success",
        message: "Thanks—your enquiry has been received. I’ll be in touch.",
        fieldErrors: {},
      };
    case "validation-error":
      return {
        phase: "error",
        message: "Please check the highlighted fields and try again.",
        fieldErrors: action.fieldErrors,
      };
    case "error":
      return { ...state, phase: "error", message: action.message };
    case "field-changed": {
      if (!state.fieldErrors[action.field]) return state;
      const fieldErrors = { ...state.fieldErrors };
      delete fieldErrors[action.field];
      return Object.keys(fieldErrors).length > 0
        ? { ...state, fieldErrors }
        : initialEnquiryFormState;
    }
    case "reset":
      return initialEnquiryFormState;
  }
}

export function getEnquiryIdempotencyKey(
  payload: EnquiryPayload,
  keysByPayload: Map<string, string>,
  createUuid: () => string = () => crypto.randomUUID(),
): string {
  const fingerprint = JSON.stringify(payload);
  const existingKey = keysByPayload.get(fingerprint);
  if (existingKey) return existingKey;

  const key = createUuid();
  keysByPayload.set(fingerprint, key);
  return key;
}

export type EnquirySubmissionResult =
  | { type: "accepted" }
  | { type: "validation-error"; fieldErrors: Partial<Record<EnquiryField, string>> }
  | { type: "unavailable" };

const enquiryFields = ["name", "email", "phone", "message"] as const;

function getSafeFieldErrors(
  value: unknown,
): Partial<Record<EnquiryField, string>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const errors: Partial<Record<EnquiryField, string>> = {};
  for (const field of enquiryFields) {
    const message = (value as Record<string, unknown>)[field];
    if (typeof message === "string" && message.length > 0) {
      errors[field] = message;
    }
  }
  return errors;
}

export async function submitEnquiry(
  payload: EnquiryPayload,
  idempotencyKey: string,
  fetchRequest: typeof fetch = fetch,
): Promise<EnquirySubmissionResult> {
  let response: Response;
  try {
    response = await fetchRequest("/api/enquiries", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { type: "unavailable" };
  }

  if (response.status === 422) {
    try {
      const body: unknown = await response.json();
      const errors =
        typeof body === "object" && body !== null && !Array.isArray(body)
          ? getSafeFieldErrors((body as Record<string, unknown>).errors)
          : {};
      return { type: "validation-error", fieldErrors: errors };
    } catch {
      return { type: "validation-error", fieldErrors: {} };
    }
  }

  if (response.status !== 202) return { type: "unavailable" };

  try {
    const body: unknown = await response.json();
    return typeof body === "object" &&
      body !== null &&
      !Array.isArray(body) &&
      (body as Record<string, unknown>).success === true
      ? { type: "accepted" }
      : { type: "unavailable" };
  } catch {
    return { type: "unavailable" };
  }
}
