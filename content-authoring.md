# Content Authoring Guide

## Purpose

This document defines how study content (Questions, Flashcards, Decks, blueprint skills) is created, reviewed, and published for the App. It runs alongside the code-track implementation plan in [tasks.md](tasks.md) and is the authoritative source for the content side of the project.

The content track exists to satisfy two hard constraints from [requirements.md](requirements.md) Requirement 11:

1. **Provenance** — every published Question must be traceable to a public, citable ServiceNow exam blueprint skill.
2. **Originality** — no Question may reproduce, verbatim or in near-identical paraphrase, content from any official exam or NDA-protected material.

Everything below is built around those two rules.

---

## The Method: Reverse-Engineer the Skills, Not the Questions

ServiceNow publishes exam blueprints for each certification (CSA, CAD, CIS-ITSM, CIS-HR, CIS-CSM, etc.). A blueprint enumerates the knowledge domains, their weights, and the specific skills tested. The blueprint is public and citable.

Our content is generated **from the blueprint**, not from any real exam:

> Blueprint skill → scenario seed → multiple-choice question → teaching explanation → review → publish

This is the same method used by Udemy, Pluralsight, and Whizlabs. It is legally defensible because the content originates from public material and is independently authored.

---

## Authoring Workflow

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ 1. Ingest        │ → │ 2. Seed          │ → │ 3. Draft         │ → │ 4. Review        │ → │ 5. Publish       │
│    blueprint     │   │    scenarios     │   │    questions     │   │    (2nd pair of  │   │    (visible to   │
│    → skills      │   │    per skill     │   │    + explanations│   │    eyes)         │   │    end users)    │
└──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
```

### Step 1 — Ingest the blueprint

For each exam:

1. Download the latest official blueprint PDF from the ServiceNow Now Learning page for that certification.
2. Record the source URL and the retrieval date.
3. Populate the `blueprint_skills` table (one row per skill in the blueprint), filling in:
   - `examId`, `domainId`, `code` (e.g., `"1.2.a"`), `description`, `blueprintSourceUrl`, `blueprintRetrievedAt`.
4. Confirm domain weights in `topic_domains` match the blueprint.

A blueprint must be re-ingested whenever ServiceNow publishes a new version of the exam. The `blueprintRetrievedAt` timestamp drives a "blueprint may be stale" check during quarterly review.

### Step 2 — Seed scenarios

For each blueprint skill, write **3–5 scenarios** in plain English. A scenario is a *situation*, not yet a question. Scenarios are the raw material for question writing.

**Example — CSA blueprint skill "Access Controls (ACLs)":**

- A user can see a record in a list but cannot open it.
- A user can open a record but cannot edit one specific field.
- A user can see a field on the list but not on the form.
- A user with the `itil` role can read incident records but not problem records.
- An admin creates a new ACL but it has no effect until the next user session.

These five lines map to ~five questions, each testing a different angle of the same skill.

Scenarios live in `/content/scenarios/<examId>/<skillCode>.md` until they're turned into questions.

### Step 3 — Draft questions

For each scenario, write one multiple-choice question following the **"one correct, three plausible"** rule.

A well-formed Question has:

| Field | Guideline |
|---|---|
| `text` | A complete scenario, ending in a clear question. 1–4 sentences. |
| Answer choices | Exactly 4. One unambiguously correct, three plausible-but-wrong. |
| `explanation` | 2–6 sentences. Says *why* the correct answer is correct, *why* each distractor is wrong, and states the underlying rule or principle. |
| `difficultyLevel` | `easy` / `medium` / `hard` — see Bloom's targets below. |
| `bloomsLevel` | `remember` / `understand` / `apply` / `analyze`. |
| `blueprintSkillId` | The skill this question tests. Required. |
| `sourceNotes` | Free-text. Document where the concept comes from and which scenario seeded the question. |
| `reviewStatus` | Starts as `draft`. |

**Example draft:**

> A user can see an incident record in a list view but receives a permission error when attempting to open the record. What is the most likely cause?
>
> A. The table-level ACL allows read but not write
> B. A record-level ACL denies read on the specific record
> C. The user lacks the `itil` role entirely
> D. A UI policy is preventing the form from rendering
>
> **Correct: B**
>
> Record-level ACLs are evaluated after table-level ACLs. The user passed the table read check (the record appeared in the list), so the block must come from a more specific ACL.
> - **A** is wrong: a read-but-not-write table ACL would still allow opening the form (write is enforced on save, not on open).
> - **C** is wrong: lacking `itil` would prevent the record from appearing in the list at all.
> - **D** is wrong: UI policies run after the form loads and cannot block record access.
>
> **Rule:** Table ACLs gate list visibility; record ACLs gate per-record access; UI policies and client scripts only affect form behavior after the record is already loaded.

### Step 4 — Review

Every drafted Question goes through a second pair of eyes before publishing. The reviewer checks:

- [ ] Question text is unambiguous; the question being asked is clear before reading the choices.
- [ ] Exactly one answer is correct.
- [ ] The three distractors are *plausible* — each one would be tempting to a partially-prepared candidate.
- [ ] Distractors are not silly, not "all of the above" / "none of the above," and not obviously absurd.
- [ ] Explanation addresses every choice (correct + all distractors).
- [ ] Difficulty and Bloom's tags match the question.
- [ ] `blueprintSkillId` is set and references a real skill.
- [ ] No phrasing is recognizably similar to known exam wording. If in doubt, paraphrase further.
- [ ] No mention of ServiceNow logos, brand assets, or NDA-protected screen content.

If approved, the reviewer sets `reviewStatus = "reviewed"`, fills in `reviewedBy` and `reviewedAt`, and moves the Question to the publish queue.

### Step 5 — Publish

Only Questions with `reviewStatus = "published"` are presented to users in any session type (Property 27 in [design.md](design.md) enforces this).

A publisher (which may be the same person as the reviewer in a solo project) does a final pass on the batch and flips the status to `published`, setting `publishedAt`. From that point the Question is live.

---

## Question Rubric

### The "one correct, three plausible" rule

A distractor is a *good* distractor when:

1. **It's something a real partially-prepared candidate would pick.** Not "obviously joke wrong."
2. **It's wrong for an instructive reason.** The explanation can teach something by ruling it out.
3. **It doesn't overlap with the correct answer.** Avoid "A or B could both be argued correct."

A distractor is *bad* when it:
- Is grammatically inconsistent with the question stem (gives the answer away).
- Is longer/more specific than other choices (the correct answer often is — make distractor length similar).
- Uses absolute words ("always," "never") unless the correct answer also does.
- Restates the question.

### Question stem style

- Write a *scenario*, not a vocabulary check. "A user X… what happens?" beats "What is the definition of an ACL?"
- Avoid trick questions. The exam tests understanding, not reading comprehension under hostile conditions.
- Keep the stem under ~60 words. If it needs to be longer, add an image (with `imageAltText`) instead of more prose.

### Explanation style

A good explanation **teaches** rather than just **justifies**.

| Pattern | Content |
|---|---|
| 1 sentence | State the correct answer's underlying rule. |
| 1 sentence per distractor | Explain *why* it's wrong, ideally by naming the misconception. |
| 1 sentence | State the broader principle the question tests. |

Good explanations turn a wrong-answer experience into a learning moment, which is the actual product.

---

## Bloom's Distribution Targets

Each Exam's published question pool should approximate this difficulty mix. Distribution is enforced at publishing time, not per session.

| Bloom's Level | `difficultyLevel` | Target Share | Question Style |
|---|---|---|---|
| Remember | `easy` | 25% | "What is the purpose of X?" Definitional. |
| Understand | `medium` | 35% | "When does X happen?" / "How does X differ from Y?" |
| Apply | `medium` / `hard` | 25% | "Given scenario X, what configuration achieves Y?" |
| Analyze | `hard` | 15% | "Scenario X is failing. What is the most likely cause?" |

Why this matters: a pool that's 80% easy questions feels good but doesn't prepare anyone. A pool that's 80% hard questions demoralizes new learners. The simulator's score is only realistic if the difficulty mix tracks the real exam, which is itself roughly this distribution.

---

## Per-Exam Content Milestones

Requirement 3.7 requires **at least 200 unique published Questions per Exam** before the Exam is shippable. Suggested milestones for each Exam:

| Milestone | Published Question Count | What unlocks |
|---|---|---|
| Alpha | 50 | Internal testing only; Exam not visible in catalog |
| Beta | 120 | Exam appears in catalog with "Beta" tag; no Exam_Simulator |
| GA | 200 | Exam fully shippable; Exam_Simulator enabled |
| Mature | 400+ | Question pool large enough that repeat sessions feel fresh |

Track these in a content dashboard (out of scope for this doc — a SQL view over `questions` filtered by `reviewStatus = 'published'` and grouped by `examId` is sufficient).

---

## What NOT to Do

A non-exhaustive list of things that will get the App removed from the store, sued, or both:

- ❌ Copying questions from the real exam (even from memory, after sitting it).
- ❌ Copying questions from a dump site, "exam topics" site, or any source distributing leaked exam content.
- ❌ Quoting more than a fragment of ServiceNow product documentation in a question or explanation without rewording.
- ❌ Using ServiceNow product UI screenshots that include the ServiceNow logo, brand color, or trade dress.
- ❌ Naming the App in a way that suggests official status ("Official ServiceNow CSA Prep," "ServiceNow Approved," etc.).
- ❌ Skipping the review step "because it's faster" — a single recognizably-leaked question is a takedown risk for the whole catalog.

---

## File Layout (proposed)

```
/content/
├── blueprints/
│   ├── csa.md                  ← copy of public blueprint + ingestion metadata
│   ├── cad.md
│   └── ...
├── scenarios/
│   ├── csa/
│   │   ├── 1.2.a-acls.md
│   │   └── ...
│   └── ...
├── questions/                  ← drafts before they're imported into the DB
│   └── csa/
│       └── batch-2026-06.json
└── review-log/
    └── csa-2026-06-review.md   ← per-batch reviewer notes for audit
```

The `questions/` JSON shape mirrors `QuestionRecord` from [design.md](design.md) so importing is a straight insert with `reviewStatus = 'draft'`.

---

## Repeatable Generator Formula

For each blueprint skill, run this five-step loop:

1. **Define the concept.** One sentence stating what the skill *is*.
2. **Identify common mistakes.** What do learners get wrong about this skill? Each mistake is a future distractor.
3. **Turn mistakes into distractors.** A mistaken belief, stated as a plausible answer, is a good distractor.
4. **Write the question.** A scenario where the correct understanding leads to the right answer and each mistaken understanding leads to a distractor.
5. **Write the explanation.** State the correct rule, then walk through each distractor and name the misconception it represents.

Used consistently, this produces 3–5 questions per skill and ensures every question teaches a specific, identifiable concept.

---

## Open Questions

These need decisions before bulk authoring starts:

- **Authoring tool.** CSV/JSON import + DB UI is the cheapest path. A small admin web app is nicer but is a separate project. Decision: defer until ~50 questions are written manually; if it hurts, build the tool.
- **Reviewer model.** Solo project = self-review with a 24-hour cooling-off period between draft and review (i.e., never review a question the same day you wrote it). Two-person project = pair review. Decide before drafting at scale.
- **Image policy.** Can we use ServiceNow product screenshots at all? Safest answer: no — use only original diagrams (drawn in Excalidraw, Figma, etc.) and reference table/field names by text rather than screenshot.
- **Localization.** English-only at launch. Translation is a future content-track project that multiplies content cost.
