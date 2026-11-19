import { PRODUCTS } from './config.mjs';
import { HttpError } from './http.mjs';

const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,78}[A-Za-z.]$/;
// 4th character "P" marks an individual's PAN; credit reports here are for individuals only.
const PAN_RE = /^[A-Z]{3}P[A-Z][0-9]{4}[A-Z]$/;
const PHONE_RE = /^[6-9][0-9]{9}$/;

export function validateOrderInput(body) {
  const fields = {};
  const bureau = typeof body.bureau === 'string' && Object.hasOwn(PRODUCTS, body.bureau) ? body.bureau : null;
  if (!bureau) fields.bureau = 'Choose a credit bureau.';

  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';
  if (!NAME_RE.test(name)) fields.name = 'Enter your full name as on your PAN card.';

  const pan = typeof body.pan === 'string' ? body.pan.trim().toUpperCase() : '';
  if (!PAN_RE.test(pan)) fields.pan = 'Enter a valid individual PAN, e.g. ABCPE1234F.';

  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!PHONE_RE.test(phone)) fields.phone = 'Enter a valid 10-digit mobile number.';

  // TransUnion needs gender to match the person; CRIF does not.
  const needsGender = bureau === 'transunion' || bureau === 'both';
  const gender = typeof body.gender === 'string' ? body.gender.trim().toLowerCase() : '';
  if (needsGender && gender !== 'male' && gender !== 'female') fields.gender = 'Select your gender.';

  if (body.consent !== true) fields.consent = 'Please give your consent to fetch your credit report.';

  if (Object.keys(fields).length) throw new HttpError(422, 'invalid_input', 'Please check the highlighted details.', { fields });
  return { bureau, name, pan, phone, gender: needsGender ? gender : null };
}
