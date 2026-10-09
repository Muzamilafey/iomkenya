const { isValidKenyanPhone } = require('./phoneUtils');
const { SPONSOR_RELATIONSHIPS } = require('./constants');

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * Checks that an application has everything required before payment.
 * Returns an array of { step, field, message } — empty when complete.
 */
function checkApplicationCompleteness(application, settings) {
  const missing = [];
  const add = (step, field, message) => missing.push({ step, field, message });
  const hasDoc = (type) => application.documents.some((d) => d.type === type);

  // Step 1 — applicant
  if (isBlank(application.applicant?.fullName)) add(1, 'applicant.fullName', "Applicant's full name is required");
  if (!application.applicant?.dateOfBirth) add(1, 'applicant.dateOfBirth', "Applicant's date of birth is required");
  if (!hasDoc('APPLICANT_PASSPORT_PHOTO')) add(1, 'APPLICANT_PASSPORT_PHOTO', "Applicant's passport photo is required");

  // Step 2 — family members (optional, but each entry must be complete)
  application.familyMembers.forEach((m, i) => {
    if (isBlank(m.fullName) || isBlank(m.relationship) || !m.dateOfBirth) {
      add(2, `familyMembers.${i}`, `Family member ${i + 1} needs a name, relationship and date of birth`);
    }
  });

  // Step 3 — refugee stay & manifest
  if (isBlank(application.refugeeInfo?.refugeeId)) add(3, 'refugeeInfo.refugeeId', 'Refugee ID is required');
  if (isBlank(application.refugeeInfo?.settlementName)) {
    add(3, 'refugeeInfo.settlementName', 'Camp or settlement name is required');
  }
  const manifestNeeded = settings?.manifestRequired || application.manifest?.hasManifest;
  if (manifestNeeded) {
    if (isBlank(application.manifest?.manifestNumber)) add(3, 'manifest.manifestNumber', 'Manifest number is required');
    if (!hasDoc('MANIFEST_CARD')) add(3, 'MANIFEST_CARD', 'Manifest card upload is required');
  }

  // Step 4 — sponsor
  const sponsor = application.sponsor || {};
  if (isBlank(sponsor.fullName)) add(4, 'sponsor.fullName', "Sponsor's full name is required");
  if (!SPONSOR_RELATIONSHIPS.includes(sponsor.relationship)) {
    add(4, 'sponsor.relationship', "Sponsor's relationship is required");
  }
  if (!isValidKenyanPhone(sponsor.phone)) add(4, 'sponsor.phone', 'A valid Kenyan sponsor phone number is required');
  if (!hasDoc('SPONSOR_PASSPORT_PHOTO')) add(4, 'SPONSOR_PASSPORT_PHOTO', "Sponsor's passport photo is required");

  // Step 6 — consent
  if (!application.consent?.accuracyConfirmed) add(6, 'consent.accuracyConfirmed', 'Please confirm the information is accurate');
  if (!application.consent?.termsAccepted) add(6, 'consent.termsAccepted', 'Please accept the Terms and Privacy Policy');

  return missing;
}

module.exports = { checkApplicationCompleteness };
