# ADR 0006: Supporting documents, folder and site links

Accepted from user instructions, 2026-10-22. Watersun Final is a read-only reference for its document catalogue (src/constants.js DOC_TYPE_LABELS and registration/operational checklists).

Customer Documents includes supporting-document checkboxes and a link per document, a customer Drive-folder link and Google Maps site-location link. Deduplicate reference aliases. Reuse existing p.drive slots and generated-document p.docLinks when mapping existing files; preserve unrecognized legacy records. Checkbox receipt and saved file link are distinct states. Saving a link checks receipt. Record the CRM actor/time as linked or received; never claim that this establishes the original Drive uploader or delivery. Link replacements retain previous link versions, without a delete control. The folder link is entered after creating the folder in Drive; no OAuth upload/creation connection is claimed.

Use the shared project JSON/API with existing branch/role checks. No duplicate storage ledger or external account writes. Validate Google Drive/Docs and Google Maps URLs. Browser geolocation is initiated only by a staff click and is not saved until they save the location. Existing quotation, feasibility and DISCOM creation remain accessible.
