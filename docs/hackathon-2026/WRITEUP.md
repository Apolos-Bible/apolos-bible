# Apolos — Scripture, native to the creator canvas

**Subtitle:** A collaborative visual studio powered by YouVersion Platform and
canvas-aware AI.

Creators, ministry leaders, and small groups often begin with a blank canvas:
an idea, a difficult question, and scattered notes across chat, documents, and
Bible tabs. Scripture is usually copied in later, losing context, licensing,
and the collaborative moment.

Apolos makes Scripture the native material of a real-time creator studio.
Inside one visual canvas, a team can explore licensed YouVersion translations,
place passages beside questions and media, draw connections, discuss them
live, and turn the result into a reusable guided experience. This is not a
Bible reader with an AI pop-up. It is a workspace for shaping culture and
community with Scripture present from the first idea.

The YouVersion Platform API supplies the licensed Bible catalog, metadata,
book/chapter indexes, and passage text. Apolos proxies these calls through its
Laravel backend, validates references, caches only successful responses, and
renders publisher copyright and YouVersion attribution. YouVersion Sign In
uses Authorization Code with PKCE; ID tokens are verified against JWKS before
accounts are linked. The Data Exchange flow requests user-highlight permission
without exposing tokens to the browser.

The canvas-aware collaborator runs through Apolos's provider-independent
LLPhant integration and the configured DeepSeek model. Recent team
conversation, canvas nodes, selected passages, and approved documents form
bounded context. The assistant can propose connections and structured canvas
changes. Existing rate limits, verified-email checks, and per-user budgets
constrain abuse and cost.

The demo follows a creator preparing a study about anxiety. She opens licensed
passages in two translations, arranges them around a real question, and asks
Apolos to help the team turn insight into a visual path. A collaborator sees
the result instantly and adds a response. What began as an isolated search
becomes a shared, source-grounded experience.

Apolos can bring this workflow to distributed churches, creator teams, student
groups, and communities already working together online: Scripture not added
after creation, but woven into creation itself.
