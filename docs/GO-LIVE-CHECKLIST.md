# Go-live checklist · MAGRABi Vendor Hub

Owner per line. Tick when done. Nothing on this list is code; the code is ready for all of it.

## Accounts and keys
- [ ] **Hosting**: a container host with a persistent disk (Render blueprint included; Railway, Fly, Azure App Service, or on-prem Docker all work). Set `PUBLIC_URL` to the final address.
- [ ] **Domain**: `vendors.magrabi.com` (or similar) pointing at the host; HTTPS on.
- [ ] **SMTP**: a sending mailbox (Microsoft 365 SMTP relay or a transactional provider). Fill `SMTP_*`. Send a test invite and confirm it is not in spam.
- [ ] **Anthropic API key** for document reading. Without it, vendors type their details and every extracted field is "needs review".
- [ ] **Wathq API key** (Saudi Business Center) for KSA registration lookups. Without it, KSA lookups are "manual".
- [ ] **Admin email** in `ADMIN_EMAIL`. That person signs in first and adds the team under Settings → Team.

## Data
- [ ] **SAP vendor list** exported to CSV (`code,name,name_ar,country,reg_number,vat_number,iban`) and imported under Settings → SAP vendors. The duplicate check is only as good as this list. Refresh monthly.
- [ ] **Country rules** reviewed by procurement under Settings → Country rules: document lists, tax formats, bank letter age. The defaults are starting points.
- [ ] **Vendor categories** reviewed (Settings → Country rules → categories list in code; tell us the final list).

## Policies
- [ ] Call-back required for new bank details: on/off and who performs the call.
- [ ] Segregation of duties: on (recommended).
- [ ] Reminder cadence to vendors who have not submitted (default: after 3 days).
- [ ] Review SLA (default: 2 working days) used for the "overdue" flags.

## Security and compliance
- [ ] Backups of the `/data` volume (database + uploaded documents): daily snapshot on the host.
- [ ] Retention: how long rejected or expired vendor files are kept (default: forever; add a job if a limit is required).
- [ ] Data processing note for vendors (what we store, who reads it, how long) linked from the vendor welcome screen.
- [ ] Access review: who is admin, approver, requester; markets per person.

## Hand-over to SAP
- [ ] Agree whether vendor creation stays manual from the keying sheet (day 1) or moves to a file/IDoc interface (later).
- [ ] Company codes and purchasing organisation per market confirmed (placeholders are in the country rules).

## Launch
- [ ] Pilot with one market and two requesters for two weeks.
- [ ] Measure: days to vendor code, first-time-right, returns per reason. The dashboard shows them.
