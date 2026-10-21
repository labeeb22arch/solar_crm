# Sunpay

Independent local React CRM prototype created from the supplied SolarFlow and Solar CRM feature references. This is a redesign foundation, not a complete migration or production deployment.

## Run

From this folder: `npm install --legacy-peer-deps`, then `npm run dev`.
Preview: http://127.0.0.1:5190. Build: `npm run build`.
The preview currently uses the parent workspace's installed dependencies. The lockfile has been regenerated for this project. Vite 8 and the React 4 plugin emit compatibility warnings; build and preview both work in this workspace.

## Implemented

- Green and warm orange identity inspired by sunpay.co.in, customer card grid, white sidebar with stage filters, responsive navigation, and centred customer popup.
- Exact 11 primary stage IDs and labels, six financial tags, and project checklist copied from the current Solar CRM constants/models.
- DISCOM Name Mismatch above Documents; Documents offers only DISCOM submission creation, preview and direct PDF download. Generated PDFs stay out of internal storage.
- Original SolarFlow module ordering: tracking/logistics, project workflow, then Team & Administration (Attendance, Operations, Vendor Availability, Installation Payments). Local attendance register added.
- Overview totals; project creation, search and stage filtering; customer details and owner editing; finance amounts and financial tags.
- Manual equipment serial register, installation and warranty dates, external Google Drive folder access.
- Follow-up notes, activity history, inventory quantity adjustments, manual JSON backup download.
- Indicative quotation preview, internal quotation status and browser print/save PDF.
- Fictional sample data and separate `sunpay.*` localStorage keys. No imported credentials, customer data, deployment domain, logos, screenshots, email endpoints or backend connections.

## Feature references

Solar CRM supplies the current stage vocabulary, financial tags, customer field concepts and checklist. SolarFlow supplies the broader project/finance/inventory/documents/calendar feature grouping and equipment/warranty concepts. The UI implementation is new; SolarFlow's full production modules have not been transplanted.

## Boundaries

This prototype has no authentication, authorization, realtime multi-user data, cloud file upload, automated daily backup or actual document approval/signing. The schedule is an installation-date register, not a full calendar. Inventory edits do not transact stock against delivery. Quotation totals are indicative and do not calculate taxes. Browser data is unsuitable for production client records. Do not present manual status changes as customer approval.

See SCOPE.md for the supplied invoice requirements and remaining integration work. Originals are unchanged. New folder: `watersun final/sunpay`.

## Validation

Production build passed. Preview rendered in the Codex browser and the project customer popup opened. Customer cards and DISCOM generation checked in the browser; direct PDF download verified. Attendance page rendered. PDF generation and pagination checked. Full interactive regression and production integrations remain unverified.

Customer popup restored to Solar CRM structure: Overview, Finance & Bank, Checklist, Notes & History; grouped customer/technical/link/bank fields and section-level Edit/Save/Cancel. Equipment fields are in Overview. Quotation remains available through Quotation Maker.

## Current mode and storage revision

- Crisp white surfaces, darker text, stronger green/orange accents; popup backdrop no longer blurs.
- Official logo acquired from the user-provided sunpay.co.in website and saved as public/sunpay-logo.png.
- Lock screen offers exactly CP, Office and Admin. Other mode definitions are commented out in modes.js/constants.js.
- CP sees fictional demo-cp assignments, with stage and finance mutations blocked in the UI. Office has operational modules. Admin adds user management, trash and exports. Lock/change-mode clears the current modal and workspace view.
- These are local demonstration modes, not secure authentication or server-side authorization. All records still reside in the browser's local storage; production roles need server enforcement.
- Customer Overview includes Google Workspace Documents with 16 required document slots. Each slot supports a manual Drive/Docs link and View/Edit access label. The links persist locally; no document bytes are uploaded or stored by the CRM. File sharing and actual access permissions remain in Google Drive. CRM does not provision Workspace storage or connect a Google account.
- Verified in the browser: CP's seven assigned sample customers; Office hides user management and export; Admin shows both; lock returns to mode selection; document link save, access URL and removal.

## Installation and administration revision

- Main accents now use solid deep green #003c23 and #002a19.
- Admin User Management adds/edits local profiles, supports CP/Office/Admin, deactivation/reactivation, duplicate-email validation and last-active-admin protection. Profiles do not create secure accounts or send invitations.
- Activity Log restores action badges, actor/time details, user/action filters and search, with compatibility for earlier local entries.
- Installation tracking provides active, today, Monday–Sunday week, calendar month, completed and issue views; editable installation dates, assigned teams and status; crew membership; issue reporting/resolution. Dates use India time.
- Browser verified profile creation, activity entry, team assignment, issue creation and schedule totals updating after a date change. Production build passed. Calendar helpers were checked for invalid dates and week/month boundaries.

# solar_crm
