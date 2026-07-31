# Master submission checklist

Legend: `[x]` implemented or prepared, `[ ]` still requires action.

## P0 — Eligibility blockers

- [ ] Confirm the exact deadline and timezone on the live Kaggle page.
- [ ] Confirm the participant/team is formally joined to the competition.
- [ ] Create the Kaggle Writeup and keep it at 500 words or fewer.
- [ ] Attach a cover image in the Media Gallery.
- [ ] Attach at least one product screenshot.
- [ ] Publish a video of 3:00 or less on YouTube.
- [ ] Attach that video to the Kaggle Media Gallery.
- [x] Prepare a public Kaggle notebook source file.
- [ ] Import, execute, save, and publish the notebook on Kaggle.
- [ ] Attach the public notebook in Project Files.
- [x] Add a public working product URL that does not require login.
- [x] Add the public frontend source repository URL with setup instructions.
- [ ] Make the backend repository public or publish a reviewable sanitized
      mirror containing the YouVersion and Gloo integrations.
- [ ] Click **Submit** on the Writeup before the deadline.
- [ ] Verify the final entry is submitted, not Draft.

## P0 — Required APIs

### YouVersion Platform

- [x] Keep the app key only in backend configuration.
- [x] Fetch the licensed Bible catalog from the backend.
- [x] Fetch Bible metadata, index, and passages.
- [x] Cache only successful upstream responses.
- [x] Display publisher copyright and YouVersion attribution.
- [x] Support YouVersion OAuth sign-in with PKCE and OIDC verification.
- [x] Request Data Exchange permission for user highlights.
- [ ] Register the exact production OAuth callback in YouVersion Platform.
- [ ] Set production `YOUVERSION_APP_KEY`.
- [x] Verify NIV11, NIrV, NASB2020, and AMP appear in production.
- [ ] Perform one end-to-end production sign-in and permission grant.
- [ ] Capture API evidence for the video without exposing credentials.

### Gloo AI Studio

- [x] Implement OAuth2 client-credentials token exchange server-side.
- [x] Cache short-lived bearer tokens and retry after an unauthorized response.
- [x] Implement Completions V2 with a values-aligned Gloo model.
- [x] Map Gloo usage into the existing per-user quota system.
- [x] Add Gloo to the AI model catalog used by the creator canvas.
- [x] Add automated request/response tests.
- [ ] Create Gloo Studio Client ID and Client Secret.
- [ ] Set production `GLOO_CLIENT_ID` and `GLOO_CLIENT_SECRET`.
- [ ] Set `LLM_PROVIDER=gloo` for the hackathon demo, or select Gloo in-app.
- [ ] Choose `GLOO_TRADITION` only if the demo intentionally targets
      `evangelical`, `catholic`, or `mainline`; otherwise leave it blank.
- [ ] Perform and record a real production Gloo response.
- [ ] Confirm spend limit and API usage dashboard.

## P1 — Product demo readiness

- [ ] Create a demo user with a verified email.
- [ ] Create a second browser/session to demonstrate collaboration.
- [ ] Prepare one polished study canvas; suggested theme: anxiety and peace.
- [ ] Put 2–3 YouVersion passages on the canvas.
- [ ] Demonstrate at least two licensed translations.
- [ ] Ask Apolos/Gloo a concise canvas-aware question.
- [ ] Show the AI result changing or enriching the canvas.
- [ ] Show another participant receiving the shared update.
- [ ] Share or publish the finished study.
- [ ] Make a clean guest/demo route if the main experience requires login.
- [ ] Remove test data, broken buttons, and console errors from the demo path.
- [ ] Verify mobile-sized and desktop-sized presentation.
- [ ] Prepare a fallback screen recording in case the live API fails.

## P1 — Story and judging rubric

- [x] Define the frontier as a collaborative creator studio.
- [x] Prepare a 3-minute story-first script.
- [x] Prepare a sub-500-word technical writeup draft.
- [x] Document the architecture and API boundaries.
- [ ] Lead with one person's problem, not a feature list.
- [ ] Explicitly say why this is not another Bible app.
- [ ] Clearly identify live YouVersion data in the video.
- [ ] Clearly identify live Gloo inference in the video.
- [ ] End with credible scale: teams, churches, creators, and communities.

## P1 — Public proof

- [x] Confirm the frontend GitHub repository is Public.
- [ ] Make the backend GitHub repository Public or publish a sanitized mirror;
      it is currently Private.
- [x] Add a root README section linking both API integrations.
- [x] Add local setup instructions for YouVersion and Gloo env variables.
- [ ] Add architecture screenshot/diagram to the Media Gallery.
- [x] Confirm `https://apolos.bible` responds without a login.
- [x] Confirm the public app and API use HTTPS.
- [ ] Confirm YouTube and Kaggle assets work in an incognito window.
- [ ] Search the public repos for leaked keys, tokens, `.env`, and recordings.

## P2 — Quality and safety

- [x] Keep provider secrets out of the browser.
- [x] Validate YouVersion identity tokens cryptographically.
- [x] Rate-limit AI and YouVersion proxy routes.
- [x] Enforce per-user AI budget.
- [x] Fail safely when upstream credentials or responses are invalid.
- [ ] Add a visible AI disclaimer to the demo path.
- [ ] Avoid claims that AI output is pastoral, medical, or crisis counseling.
- [ ] Obtain consent from anyone visible or audible in the video.
- [ ] Verify every displayed Bible edition's license and attribution.
- [ ] Back up the final video, cover image, and submission text.

## Final 15-minute audit

- [ ] Writeup word count is 500 or fewer.
- [ ] Video duration is 3:00 or less.
- [ ] Cover image is selected.
- [ ] Notebook is Public and attached.
- [ ] YouTube video is accessible and attached.
- [ ] Project URL opens without login.
- [ ] Repository URLs open without login.
- [ ] No secret appears in the notebook, video, screenshots, or Git history.
- [ ] All links in `SUBMISSION_FIELDS.md` are filled and tested.
- [ ] Kaggle displays **Submitted**.
