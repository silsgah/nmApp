# TECHNICAL PROPOSAL & COMMERCIAL CONTRACT DRAFT

**PROJECT:** Clinical Practical Examination Management System (CPEMS)  
**SUBMITTED TO:** The Commandant / Principal, Ghana Armed Forces College of Nursing and Midwifery (GAFCONM)  
**LOCATION:** 37 Military Hospital Complex, Neghelli Barracks, Accra, Ghana  
**SUBMITTED BY:** EED Soft Consult  
**CONTACT:** info@eedconsult.com | www.eedconsult.com | Tel: +233 558075023  
**DOCUMENT REF:** EED-GAFCONM-CPEMS-2025-V1  
**DATE:** March 2025  
**FEE STRUCTURE:** GHS 23.00 per Student / per Semester  

---

## 1. COVER LETTER & EXECUTIVE SUMMARY

**To:**  
The Principal / Head of Examinations  
Ghana Armed Forces College of Nursing and Midwifery (GAFCONM)  
37 Military Hospital Complex  
Accra, Ghana  

**Dear Sir/Madam,**

### Re: Proposal & Service Contract for the Digital Practical Examination Management System

EED Soft Consult is pleased to present this comprehensive technical and financial proposal for the complete digital transformation of the clinical practical examinations for the **Registered General Nursing (RGN)** and **Registered Midwifery (RM)** programmes at the Ghana Armed Forces College of Nursing and Midwifery (GAFCONM).

Our specialized **Clinical Practical Examination Management System (CPEMS)** replaces labor-intensive, error-prone paper scorecards with an automated, multi-examiner digital scoring system. The platform streamlines candidate assessment, real-time checklist scoring, independent Obstetric & Care Study evaluations, automated weighted aggregations, audit trails, and instant PDF result generation—saving hundreds of administrative hours while guaranteeing 100% mathematical accuracy and institutional integrity.

This proposal details the specialized system specifications, cloud architecture, quality assurance protocols, and our transparent **Per-Student Examination Service Model of GHS 23.00 per student per semester**.

We look forward to partnering with GAFCONM to establish a benchmark for military nursing examination excellence in Ghana and the West African sub-region.

Yours faithfully,

**Lead Solutions Consultant / Managing Director**  
*EED Soft Consult*  
info@eedconsult.com | +233 558075023  

---

## 2. INSTITUTIONAL CHALLENGES & SOLUTION ARCHITECTURE

### 2.1 The Current Operational Challenge
Clinical practical exams in nursing and midwifery require evaluating hundreds of candidates across multiple dynamic stations with 2 to 3 independent examiners per station. Key challenges with paper-based workflows include:
1. **Scoring Discrepancies & Calculation Errors:** Manual tabulation of 0–4 and 0–2 scale step checklists, category weights, and examiner score averages introduces transcription and arithmetic errors.
2. **Delayed Result Publication:** Days or weeks spent reconciling paper scorecards, care study rubrics, and care plan scores.
3. **Integrity & Audit Tracking:** Lack of verifiable, tamper-evident audit trails when candidates require re-assessment or marks require reconciliation.

### 2.2 The CPEMS Solution Architecture
CPEMS is a secure, role-based web and mobile-responsive application built for high-concurrency exam day scoring:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GAFCONM EXAMINATION PORTAL                           │
├───────────────────┬────────────────────────────┬───────────────────────┤
│  ADMINISTRATOR    │     EXAMINER PORTAL        │    CANDIDATE PORTAL   │
│  - Session Setup  │  - Live Station Scoring    │  - Candidate Index    │
│  - Task Bank (RGN/RM) - Dynamic Task Selection │  - Verified Results   │
│  - Matrix & Audits│  - Care Plan Scoring       │  - Breakdown Slips    │
│  - PDF Publishing │  - Midwifery Case Studies  │  - Performance Report │
│  - User Management│  - Obstetric Exam Rubrics  │                       │
└───────────────────┴────────────────────────────┴───────────────────────┘
```

---

## 3. SCOPE OF WORK & CORE SYSTEM MODULES

| Module | Features & Capabilities |
| :--- | :--- |
| **1. Exam Session & Scheduling** | Configurable academic year, semester, programme (RGN/RM), year level (Year 2/3), examiner count per station (1–3), and custom category pass marks. |
| **2. Dynamic Task Bank** | Pre-loaded checklist bank mapped to RGN and RM clinical competencies with 0–4 scale (RGN/RM component tasks) and 0–2 scale (Health Assessment). Supports Key Step marking. |
| **3. Live Examiner Scoring** | Real-time candidate evaluation, automatic multi-examiner score averaging, draft saving, and instant validation before final submission. |
| **4. Care Plan & Case Study** | Dedicated structured rubric modules for Surgical/Medical Care Plans and 6-section Midwifery Case Studies (Data Gathering, Care Plan, Viva Voce, etc.). |
| **5. Independent Obstetric Exam** | Compulsory items (Anatomy, Abnormal Pregnancies) + Dynamic 2-level dependent optional item selector with auto-calculation. |
| **6. Real-time Assessment Matrix**| Live administrative dashboard monitoring candidate progress across all stations with audited scorecard reopen workflows. |
| **7. Automated Results & PDF Slips**| Immediate computation of weighted scores, categorical breakdown, pass/fail grading, and generation of official GAFCONM PDF examination slips. |

---

## 4. CLOUD INFRASTRUCTURE, SECURITY & HOSTING SPECIFICATIONS

To guarantee 99.9% uptime during high-stakes examination sessions, EED Soft Consult deploys an enterprise-grade cloud environment:

1. **Custom Domain & SSL/TLS Encryption:**  
   - Dedicated institutional subdomain (e.g., `exams.gafconm.edu.gh` or `portal.gafconm.edu.gh`).  
   - Automated 256-bit SSL/TLS end-to-end encryption.
2. **High-Availability Cloud Application Server:**  
   - Auto-scaling edge deployment with ultra-fast latency across Ghana and West Africa.  
   - Redundant compute nodes to handle concurrent exam-day examiner submissions.
3. **Managed PostgreSQL Database:**  
   - High-performance relational database with ACID compliance.  
   - Daily automated encrypted backups with Point-In-Time Recovery (PITR).
4. **Security & Role-Based Access Control (RBAC):**  
   - JWT session management, bcrypt password hashing, and strict role guards separating Admin, Examiner, and Candidate data access.

---

## 5. COMMERCIAL PRICING & FINANCIAL PROPOSAL

EED Soft Consult provides a transparent, predictable, and highly cost-effective fee structure specifically structured for GAFCONM.

### PRIMARY COMMERCIAL MODEL: PER-STUDENT SEMESTER FEE
**Rate: GHS 23.00 per Enrolled Student / per Semester**  
*Pay-As-You-Examine • Zero Upfront Capital Outlay • All-Inclusive*

Under this primary commercial model, GAFCONM incurs **zero upfront software development or licensing costs**. The College is billed strictly at a flat fee of **GHS 23.00 per candidate per academic semester** sitting the clinical practical examinations.

#### What Is Covered by the GHS 23.00 Fee:
* **Complete Practical Station Marking:** Multi-station evaluation across Major, Minor, and Health Assessment checklists.
* **Multi-Examiner Consensus:** Blind scoring, automated score aggregation, and real-time variance/reconciliation detection.
* **Specialized Clinical Modules:** Midwifery Case Studies (Data Gathering, Care Plan, Viva Voce), Care Plan rubrics, and the Obstetric Examination.
* **Instant Official Results:** Automated computation of weighted pass/fail grades and automated generation of official GAFCONM student PDF result slips.
* **Cloud Infrastructure Fully Absorbed:** Dedicated cloud servers, SSL encryption, and daily encrypted database backups with zero separate hosting surcharges.
* **On-Site Exam Day Technical Standby:** EED systems engineers physically present at GAFCONM examination stations throughout the examination period.

#### Transparent Semester Billing Schedule (Illustrative Cohorts)

| Candidate Cohort | Fee / Student | Total Semester Invoice | Inclusions |
| :---: | :---: | :---: | :--- |
| **200 Students** | GHS 23.00 | **GHS 4,600.00** | Full examination suite, cloud hosting, PDF slips, on-site standby |
| **350 Students** | GHS 23.00 | **GHS 8,050.00** | Full examination suite, cloud hosting, PDF slips, on-site standby |
| **500 Students** | GHS 23.00 | **GHS 11,500.00** | Full examination suite, cloud hosting, PDF slips, on-site standby |
| **650 Students** | GHS 23.00 | **GHS 14,950.00** | Full examination suite, cloud hosting, PDF slips, on-site standby |
| **800 Students** | GHS 23.00 | **GHS 18,400.00** | Full examination suite, cloud hosting, PDF slips, on-site standby |

*Note: Invoicing is based strictly on the official candidate roster certified by the GAFCONM Examination Directorate for each semester's examination cycle. No minimum cohort volume is required.*

---

### ALTERNATIVE OPTION: INSTITUTIONAL ENTERPRISE LICENSE (PERPETUAL / ANNUAL BUYOUT)
*Provided for institutions requiring dedicated private-cloud self-hosting and permanent code ownership.*

| Phase / Component | Scope & Deliverables | Cost (GHS) |
| :--- | :--- | :---: |
| **1. System Setup & Customization** | Custom codebase deployment, task bank ingestion, role setup, staff training | **GHS 38,000.00** *(One-time)* |
| **2. Annual Cloud Infrastructure** | High-availability redundant web servers, managed PostgreSQL cluster, SSL | **GHS 12,000.00** *(Annual)* |
| **3. Annual SLA & On-Site Support** | 24/7 technical monitoring, security patches, on-site exam day engineering | **GHS 14,000.00** *(Annual)* |
| **TOTAL YEAR 1 CAPITAL INVESTMENT:** | | **GHS 64,000.00** |
| **SUBSEQUENT ANNUAL RENEWAL (Year 2+):**| *(Hosting, Database, Maintenance, SLA & Support)* | **GHS 26,000.00 / yr** |

---

## 6. IMPLEMENTATION ROADMAP & DEPLOYMENT TIMELINE

The system will be fully configured and live within **14 business days** from contract sign-off:

```
Week 1: Days 1–4        Week 2: Days 5–9         Week 3: Days 10–14
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Infrastructure   │    │ Task Bank        │    │ Simulation &     │
│ & Custom Domain  │───>│ & Student Data   │───>│ Staff Training   │───> [ LIVE EXAM ]
│ Deployment       │    │ Ingestion        │    │ Dry-Run Session  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

* **Milestone 1 (Days 1–4):** Domain connection, cloud database provisioning, security hardening, and branding alignment.
* **Milestone 2 (Days 5–9):** Ingestion of RGN & RM task rubrics, step definitions, and candidate cohort records.
* **Milestone 3 (Days 10–12):** Interactive examiner and administrator training workshop at GAFCONM premises.
* **Milestone 4 (Days 13–14):** Mock dry-run examination simulation and official go-live sign-off.

---

## 7. SERVICE LEVEL AGREEMENT (SLA) & SUPPORT COMMITMENT

EED Soft Consult guarantees standard and mission-critical support tiers:

| Severity Level | Definition | Response Time | Target Resolution |
| :--- | :--- | :---: | :---: |
| **Critical (Exam Day)** | Scoring outage, examiner login block, or network interruption during live exam | **< 15 Minutes** | **< 45 Minutes** |
| **High** | Session configuration error or student assignment conflict before exam day | **< 1 Hour** | **< 4 Hours** |
| **Medium** | General administrative inquiry, task checklist edits, or report adjustments | **< 4 Hours** | **< 12 Hours** |
| **Routine Maintenance** | Scheduled database maintenance and platform upgrades | Non-exam hours | Within maintenance window |

---

## 8. MASTER SERVICE AGREEMENT & TERMS OF CONTRACT

1. **Confidentiality & Data Sovereignty:** All student records, examiner scorecards, and institutional marks remain the exclusive property of GAFCONM. EED Soft Consult adheres to strict data privacy and non-disclosure protocols.
2. **Accuracy Guarantee:** EED Soft Consult warrants that the system will perform strictly according to approved clinical rubrics with 100% mathematical accuracy.
3. **Payment Terms (Primary Per-Student Model):** Invoiced per academic semester based on the certified candidate list. 70% payable upon candidate register certification prior to examination commencement; 30% balance payable upon publication of official student result slips.
4. **Payment Terms (Enterprise License Option):** 50% mobilization advance upon contract signing; 30% upon successful training & mock dry-run; 20% upon official first examination session completion.
5. **Contract Validity:** This proposal and quoted pricing are valid for **60 calendar days** from submission date.

---

## 9. ACCEPTANCE & CONTRACT SIGN-OFF

IN WITNESS WHEREOF, the parties hereto have executed this Examination System Proposal and Contract Agreement as of the date signed below:

### FOR: EED SOFT CONSULT

**Name:** ..........................................................................  
**Title:** Managing Director / Lead Solutions Consultant  
**Signature:** ...................................................................  
**Date:** ...........................................................................  
**Official Stamp:**  

---

### FOR: GHANA ARMED FORCES COLLEGE OF NURSING AND MIDWIFERY (GAFCONM)

**Name:** ..........................................................................  
**Title:** Commandant / Principal / Head of Institution  
**Signature:** ...................................................................  
**Date:** ...........................................................................  
**Official Stamp:**  
