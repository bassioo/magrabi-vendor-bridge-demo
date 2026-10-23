export interface TourStep {
  path: string;
  target: string; // data-tour attribute value
  title: string;
  body: string;
  placement?: 'bottom' | 'top' | 'right' | 'left';
}

// The guided tour: what the system is and what to click. Driven by data-tour attributes in the pages.
export const TOUR_STEPS: TourStep[] = [
  { path: '/procurement', target: 'kpis', title: 'Your morning view', body: 'Four numbers that matter: who is waiting, how long onboarding takes, how often vendors get it right first time, and how many were sent back this month. All from the sample data since go-live.' },
  { path: '/procurement', target: 'attention', title: 'What needs you today', body: 'Flags come first. Each row is one vendor with the result of the automated checks. Click Review to open the file.' },
  { path: '/procurement/queue', target: 'invite', title: 'One link per vendor', body: 'Invite a vendor with an email and a country. They get one bilingual link, and the checklist they see is built from that country\'s rules. No forms by email, no chasing attachments.', placement: 'left' },
  { path: '/procurement/queue', target: 'market-filter', title: 'Seven markets, one queue', body: 'KSA, UAE, Egypt, Kuwait, Qatar, Bahrain and Oman all land in the same queue. Filter by market when you need to.' },
  { path: '/procurement/countries', target: 'country-tabs', title: 'The paperwork differs by country', body: 'Registry, tax regime, document list and IBAN format are defined per market in one place. Kuwait and Qatar have no VAT, so no VAT certificate is asked for. Procurement owns these rules.' },
  { path: '/procurement/vendors/v-nile', target: 'extracted', title: 'AI reads', body: 'Every field shows where it came from: verified by an official registry, extracted from the document and consistent, or flagged for a person to look at.', placement: 'left' },
  { path: '/procurement/vendors/v-nile', target: 'checks', title: 'Rules check. Registries confirm.', body: 'IBAN checksum, account holder name, expiry dates, the 6-month bank letter rule, a duplicate check against the SAP vendor list, and a sanctions screen. Here the duplicate check found an existing vendor with the same tax number.', placement: 'left' },
  { path: '/procurement/vendors/v-nile', target: 'decision', title: 'A person decides', body: 'Nothing is approved automatically. Approve needs a confirmed call-back on new bank details. Return sends an AI-drafted note in English and Arabic that you can edit first. The requester can never approve their own invite.', placement: 'bottom' },
  { path: '/procurement/vendors/v-bright/audit', target: 'audit', title: 'Every step is logged', body: 'Uploads, AI results, rule results, registry responses and reviewer actions, with names and timestamps. Bright Display\'s old bank letter was caught at upload, before anyone in procurement saw it.' },
  { path: '/procurement/settings', target: 'policies', title: 'Policies you control', body: 'Call-back requirement, segregation of duties, bank-letter age and auto-assignment are switches, not code. Flip one and the review screen follows.' },
  { path: '/vendor/inv-alnoor-7f3k', target: 'lang-toggle', title: 'The vendor\'s side, in both languages', body: 'This is what Al Noor sees from the invite link. One toggle flips the whole experience to Arabic, right to left.', placement: 'bottom' },
  { path: '/vendor/inv-alnoor-7f3k', target: 'checklist', title: 'A checklist built from the rules', body: 'The vendor knows exactly what to prepare before they start. A signed quotation is enough; we never ask for an invoice before the PO.', placement: 'left' },
  { path: '/vendor/inv-alnoor-7f3k', target: 'start', title: 'Now try it yourself', body: 'Click Start, use the small "Fill with sample data" pill on each step, and drop the files from the sample documents folder into the upload slots. Then approve it in the console as Deena.' },
];
