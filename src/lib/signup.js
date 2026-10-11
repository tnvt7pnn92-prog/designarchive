// The rules for the account form, shared by the form, the account page, the Railway server
// (server/) and the tests: the server checks everything again, the same way.
import { isCountry } from "./countries.js";

// Italy's age of digital consent (D.Lgs. 101/2018, art. 2-quinquies): 14.
export const MIN_AGE = 14;
export const MAX_AGE = 120;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;
export const NAME_MAX = 60;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// A local date as YYYY-MM-DD, `years` years before `today`.
export function isoDateYearsAgo(years, today = new Date()) {
  const d = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "missing", "invalid", "tooYoung" or null.
export function birthDateProblem(value, today = new Date()) {
  if (!value) return "missing";
  const m = DATE.exec(value);
  if (!m) return "invalid";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return "invalid";
  if (value > isoDateYearsAgo(0, today) || value < isoDateYearsAgo(MAX_AGE, today)) return "invalid";
  if (value > isoDateYearsAgo(MIN_AGE, today)) return "tooYoung";
  return null;
}

// "short" (under 8 characters), "long", "weak" (not both letters and digits) or null.
export function passwordProblem(value) {
  if (!value || value.length < MIN_PASSWORD) return "short";
  if (value.length > MAX_PASSWORD) return "long";
  if (!/\p{L}/u.test(value) || !/\d/.test(value)) return "weak";
  return null;
}

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
export const emailValid = (value) => EMAIL.test(normalizeEmail(value)) && normalizeEmail(value).length <= 254;

// The personal data of an account: each field's problem as a key under auth.errors, {} if fine.
export function validateProfile(values, today = new Date()) {
  const errors = {};
  for (const field of ["firstName", "lastName"]) {
    const value = String(values[field] ?? "").trim();
    if (!value) errors[field] = "required";
    else if (value.length > NAME_MAX) errors[field] = "tooLong";
  }
  const birth = birthDateProblem(values.birthDate, today);
  if (birth) errors.birthDate = birth === "missing" ? "required" : birth === "tooYoung" ? "tooYoung" : "birthInvalid";
  if (!isCountry(values.country)) errors.country = "required";
  return errors;
}

// The whole sign-up form: personal data, email and password.
export function validateSignUp(values, today = new Date()) {
  const errors = validateProfile(values, today);
  if (!String(values.email ?? "").trim()) errors.email = "required";
  else if (!emailValid(values.email)) errors.email = "invalidEmail";
  const password = passwordProblem(values.password);
  if (password) errors.password = password === "short" ? "passwordShort" : password === "long" ? "passwordLong" : "passwordWeak";
  return errors;
}
