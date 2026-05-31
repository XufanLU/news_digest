---
title: "Builders Unscripted: Ep. 3 - Matias Castello, Product Lead at Alchemy"
channel: "OpenAI"
video_url: "https://www.youtube.com/watch?v=8QKqENa_eQQ"
published: "2026-05-29T20:29:25+00:00"
transcript: "transcripts/clean/8QKqENa_eQQ.txt"
status: "generated"
---

# Builders Unscripted: Ep. 3 - Matias Castello, Product Lead at Alchemy

## What This Is About

This Builders Unscripted episode follows Matias Castello, product lead at Alchemy, and how he uses Codex and GPT-5.5 across work and personal projects. The conversation covers AI-assisted docs edits, retroactive incident review, internal PM skills, agent-friendly developer platforms, Codex-driven feature experiments, and playful custom interfaces like Discord, iPhone, and Apple Watch entry points for starting coding jobs.

## Important Concepts

- Codex as teammate: Alchemy uses Codex for docs edits, code review, PR iteration, PM work, and internal skills.
- Retroactive code review: teams can replay old incidents through Codex to see whether AI review would have caught the issue.
- Shared skill repositories: Alchemy uses reusable skills for PRDs, customer feedback analysis, and other product workflows.
- Agent-aware developer platforms: developer tooling now needs to serve humans using AI and, increasingly, autonomous agents directly.
- Preference files and upfront clarification: Matias reduces bad surprises by encoding how he likes to work and forcing assumptions into the open.
- Feature-flagged experiments: Codex researches, designs, and builds candidate features behind toggles so a human can quickly choose what stays.
- Codex App Server interfaces: Matias extends Codex through a Mac writing app, Discord, iPhone, and Apple Watch voice workflows.

## Learning Takeaways

- Code review can be the adoption wedge for AI inside serious engineering teams because it connects directly to incident prevention.
- The highest-leverage Codex workflows are not one-off prompts; they are repeatable processes encoded as skills, project conventions, and preference files.
- Good delegation requires giving the agent enough product taste, constraints, and decision criteria before it starts building.
- Feature flags are a practical pattern for agent-built work: let the agent generate options, but keep human review cheap and reversible.
- AI changes platform design. If developers build with agents, APIs, docs, onboarding, and signup flows need to be legible to agents too.
- Personal productivity can shift from "sit and build" to "dispatch work, review results, and keep control at decision points."

## Questions To Explore

- What would a strong `AGENTS.md` or preference file look like for my own Daily Digest workflow?
- Which repeated PM or learning tasks should become reusable Codex skills?
- Could daily notes support feature-flag-style experiments, where drafts, post formats, or summaries are generated as selectable variants?
- What parts of this app's docs or workflows would fail if an autonomous agent tried to use them?
- How should agent-generated feature ideas be scored before implementation?

## Useful Examples, Tools, Or Links

- Codex in Slack: used for lightweight documentation edits without running the site locally.
- Codex review: used to review PRs and replay prior incidents.
- Linear: used as the project management interface where Codex can create milestones, issues, and execution plans.
- Internal skills repo: shared source of reusable workflows for PM and engineering tasks.
- Feature flags: used to test agent-built feature experiments independently.
- Codex App Server: used to build custom entry points around a ChatGPT/Codex account.
- OpenClaw, Discord, iPhone, and Apple Watch integrations: examples of alternative interfaces for dispatching coding jobs.

## Optional Post Draft

Title ideas:

- The real Codex unlock is workflow design
- Matias Castello's agent workflow: dispatch, review, decide
- AI builders need skills, preferences, and feature flags

Draft:

Matias Castello's Codex setup has a useful lesson: the magic is not one prompt.

It is the system around the prompt:

- a preference file that explains how he likes to work
- reusable skills for repeated workflows
- Linear as the planning surface
- Codex doing research before implementation
- feature flags so generated ideas are easy to test
- phone, Discord, and watch entry points for dispatching jobs

The pattern is simple but powerful: let the agent generate and build options, then keep the human at the decision points.

That feels like a much more realistic model of AI-assisted building than "the model does everything."
