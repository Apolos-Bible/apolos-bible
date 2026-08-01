# Apolos — New Frontiers preparation kit

This folder is the single source of truth for preparing the hackathon
submission.

## Product thesis

**Apolos is a collaborative Scripture creator studio.** It brings licensed
YouVersion text and Apolos's canvas-aware AI into the visual canvas where
leaders, creators, and small groups already turn ideas into experiences.
Scripture is not a pop-up or a generated quote: it is source material that can
be read, compared, arranged, discussed, and shared in real time.

## Start here

1. Work down [CHECKLIST.md](./CHECKLIST.md).
2. Rehearse [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md).
3. Record from [VIDEO_SCRIPT.md](./VIDEO_SCRIPT.md).
4. Paste and tailor [WRITEUP.md](./WRITEUP.md), keeping it under 500 words.
5. Upload the notebook in [`notebook/`](./notebook/) to Kaggle.
6. Fill every URL in [SUBMISSION_FIELDS.md](./SUBMISSION_FIELDS.md).
7. Submit the Kaggle Writeup; saving a draft is not submission.

## Current honest status

- YouVersion Bible catalog, passage reading, attribution, caching, sign-in, and
  Data Exchange permission flow are implemented.
- The AI assistant continues to use LLPhant with the configured DeepSeek API
  key. No Gloo runtime code or credentials are used.
- The challenge text requires both YouVersion and Gloo. With the current
  product decision, this is an unresolved eligibility blocker and must never be
  represented as completed.
- The product, repository, notebook, screenshots, video, and Kaggle Writeup
  must all be publicly reachable to judges without requesting access.

## Official references

- Challenge rules: use the live Kaggle competition page as the authority.
- YouVersion Platform: <https://developers.youversion.com/>
- Gloo requirement reference:
  <https://docs.gloo.com/getting-started/quickstart-developers>
