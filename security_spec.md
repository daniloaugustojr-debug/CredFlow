# CredFlow Firebase Security Spec - Phase 0

This document defines the data invariants, strict security postures, and "Dirty Dozen" malicious payloads designed to test our rules.

## Group 1: Data Invariants
1. **Tenant Isolation (Multi-Tenancy)**: No user from `company-A` can read, edit, list, or delete documents inside `company-B`'s branch: `/empresas/{empresaId}/...`.
2. **Role Hierarchy Enforcements**: Only `SUPER_ADMIN` or `MASTER_USER` can write/update cash balance entries.
3. **Immutability Invariant**: Key identifier fields (`id`, `companyId`, `createdAt`, `userId`) cannot be modified after document creation.
4. **Validation Integrity**: Values like standard interest rates, phone numbers and names must meet basic schema bounds (no 1MB junk ID keys or negative percentages).

## Group 2: The "Dirty Dozen" Payloads (Denial of Wallet / Identity Spoofing Attacks)
Below are 12 specific attack payloads that MUST be rejected with `PERMISSION_DENIED`:

1. **Malicious ID injection** (Attack ID: `MAL_01`): Adding a client with a 1.5KB long key string loaded with junk characters to corrupt database search performance.
2. **Cross-Tenant Hijack** (Attack ID: `MAL_02`): Authenticated user of `com-1` attempting to load or update client records under `/empresas/com-2/clientes/c-1`.
3. **Privilege Escalation** (Attack ID: `MAL_03`): A `SECONDARY_USER` attempting to change their role to `SUPER_ADMIN` in their user profile payload.
4. **Self-Approve Pending Credit** (Attack ID: `MAL_04`): Non-authorized Operator or External client submitting an update to a loan to change status directly from `PENDING` to `APPROVED`.
5. **Retroactive Timestamp Modification** (Attack ID: `MAL_05`): Submitting client-side custom timestamps for `createdAt` and `updatedAt` to forge audited action dates.
6. **Ghost Field Poisoning (Shadow Update)** (Attack ID: `MAL_06`): Sending a valid update payload plus an unauthorized field `isPremiumVerified: true` or `bypassed: true`.
7. **Negative Capital Injection** (Attack ID: `MAL_07`): Submitting a negative `amount` (-500,000 MZN) for capital replenishment to drain the corporate balance metrics.
8. **Immutability Breach** (Attack ID: `MAL_08`): Modifying the underlying `companyId` of a loan or client to orphan the record or shift ownership to another tenant.
9. **Fake Payment Audits** (Attack ID: `MAL_09`): Submitting payment record without the mandatory relational validation verifying that the corresponding loan ID actually exists.
10. **Bypassed Email Verification** (Attack ID: `MAL_10`): Logging in with an unverified email claiming admin privileges without `request.auth.token.email_verified == true`.
11. **Anonymized DB Scraping** (Attack ID: `MAL_11`): Triggering blanket reads or lists over `/empresas` without standard authenticated sessions.
12. **Out of bounds Integers** (Attack ID: `MAL_12`): Submitting an interest rate of `5000%` or a negative term term of `-12 months` to corrupt financial math engines.

## Group 3: Test Verification Results
All 12 malicious payload checks are successfully addressed and rejected with `PERMISSION_DENIED` by our zero-trust attribute verification rules inside `firestore.rules`.
