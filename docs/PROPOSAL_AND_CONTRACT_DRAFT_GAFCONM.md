# TECHNICAL PROPOSAL & COMMERCIAL CONTRACT DRAFT

**PROJECT:** Clinical Practical Examination Management System (CPEMS)  
**SUBMITTED TO:** The Commandant / Principal, Ghana Armed Forces College of Nursing and Midwifery (GAFCONM)  
**LOCATION:** 37 Military Hospital Complex, Neghelli Barracks, Accra, Ghana  
**SUBMITTED BY:** EED Soft Consult  
**CONTACT:** info@eedconsult.com | www.eedconsult.com | Tel: +233 558075023  
**DOCUMENT REF:** EED-GAFCONM-CPEMS-2025-V1  
**DATE:** March 2025 / Academic Year 2024/2025  

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

This document details the functional specifications, cloud infrastructure requirements (domain, high-availability hosting, managed database), Service Level Agreements (SLA), and transparent pricing options (both **Institutional Enterprise** and **Per-Candidate** models).

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

We provide two flexible commercial engagement models tailored to GAFCONM’s procurement requirements:

### SECTION A: INFRASTRUCTURE & RECURRING ANNUAL COSTS

| Item | Description | Billing Cycle | Price (GHS) |
| :--- | :--- | :--- | :---: |
| **A1. Domain & SSL Certification** | Official domain management, DNS routing, and enterprise SSL security | Annual | **GHS 1,200.00** |
| **A2. Cloud Application Hosting** | High-availability redundant web servers, Edge CDN, and auto-scaling bandwidth | Annual | **GHS 6,800.00** |
| **A3. Managed PostgreSQL Database** | Dedicated cloud database, automated backups, and encrypted storage | Annual | **GHS 5,500.00** |
| **A4. SLA Maintenance & Support** | System patches, database maintenance, uptime monitoring, bug fixes | Annual | **GHS 9,500.00** |
| **A5. On-site Exam Day Technical Standby** | Dedicated EED technical engineers physically present during practical exams | Per Exam Period | **GHS 4,500.00** |
| **SUBTOTAL (Annual Cloud & Support Base):** | | **Annual** | **GHS 23,000.00** |

---

### SECTION B: COMMERCIAL PRICING OPTIONS

#### OPTION 1: INSTITUTIONAL ENTERPRISE LICENSE (FIXED ANNUAL / PERPETUAL)
*Recommended for unrestricted institutional adoption with full administrative control.*

| Phase / Deliverable | Scope & Inclusions | One-Time / Annual Cost |
| :--- | :--- | :---: |
| **1. System Implementation & Setup** | Customization for GAFCONM, task bank ingestion (RGN & RM), server configuration, and admin onboarding | **GHS 38,000.00** *(One-time)* |
| **2. Annual Cloud, Hosting & DB (A1–A3)** | Domain, SSL, high-speed hosting, and managed PostgreSQL database | **GHS 13,500.00** *(Annual)* |
| **3. Annual Maintenance & SLA Support (A4–A5)**| 24/7 technical support, updates, backups, and on-site exam day support | **GHS 14,000.00** *(Annual)* |
| **TOTAL YEAR 1 INVESTMENT:** | *(Implementation + Full Year Cloud & Support)* | **GHS 65,500.00** |
| **SUBSEQUENT ANNUAL RENEWAL (Year 2+):**| *(Hosting, Database, Maintenance, SLA & Support)* | **GHS 27,500.00 / year** |

---

#### OPTION 2: PER-CANDIDATE / PER-SESSION EXAMINATION FEE MODEL
*Zero initial capital expenditure model. Payment is billed strictly per candidate enrolled in each practical examination session.*

| Candidate Volume (Per Exam Session) | Cost Per Student / Session | Inclusions |
| :--- | :---: | :--- |
| **Tier 1: Up to 150 Students** | **GHS 120.00** / candidate | Full system access, all stations, Care Plan & Case Study, cloud hosting, automated PDF results, examiner standby support. |
| **Tier 2: 151 – 350 Students** | **GHS 95.00** / candidate | Full system access, cloud hosting, on-site technical engineer standby, result computation, database backups. |
| **Tier 3: 351+ Students** | **GHS 80.00** / candidate | Enterprise volume rate, full institutional access, dedicated database instance, priority examiner training. |

*Note on Option 2: The institution incurs zero upfront implementation costs; hosting, domain, database, and technical support are included in the per-candidate fee.*

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
2. **Intellectual Property:** EED Soft Consult grants GAFCONM an exclusive institutional operating license for the duration of the agreement.
3. **Payment Terms (Option 1):** 50% mobilization advance upon contract signing; 30% upon successful training & mock exam; 20% upon official first examination session completion.
4. **Payment Terms (Option 2):** Invoiced per enrolled candidate list 7 days prior to examination session date.
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
