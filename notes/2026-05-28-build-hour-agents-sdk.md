---
title: "Build Hour: Agents SDK"
channel: "OpenAI"
video_url: "https://www.youtube.com/watch?v=tK32trvj_b4"
published: "2026-05-28T20:09:34+00:00"
transcript: "transcripts/clean/tK32trvj_b4.txt"
status: "generated"
---

# Build Hour: Agents SDK

## What This Is About

This OpenAI Build Hour introduces recent updates to the Agents SDK and shows how to build a sandbox-using agent. The session explains why production agents are hard, how the SDK borrows from Codex-style long-running work, and how sandboxes, skills, hosted shell, containers, memory, and session management help agents do real work across files and tools.

## Important Concepts

- Agents SDK: an open-source framework for building agent loops with tools, orchestration, and model-native work patterns.
- Codex-style harness: an agent loop inspired by Codex, including shell interaction, long-running command handling, file editing, context compaction, and computer use patterns.
- Sandbox-using agents: agents can work in isolated environments with files, shell commands, and controlled execution.
- Harness vs compute: the session emphasizes separating the agent orchestration layer from ephemeral sandbox compute so state can be rehydrated if a container dies.
- Hosted shell tool: a Responses API feature that spins up a container, lets the model work on files, and returns results.
- Skills: reusable bundles of instructions, scripts, and resources that specialize an agent for a task.
- Capabilities: SDK objects that can combine tools, instructions, manifests, and startup behavior.
- Session management: the SDK handles snapshotting and resuming tasks so agents can work over long trajectories.

## Learning Takeaways

- Production agents are not just "LLM + tool loop." You need sandbox lifecycle, state recovery, file access, security boundaries, and a way to add domain-specific context.
- Separating harness from compute is a strong architecture pattern. The sandbox can be ephemeral, while orchestration and state live elsewhere.
- Skills are useful because they make domain expertise reusable and versionable. GitHub or the Skills API can become the source of truth.
- The SDK is trying to move developers away from writing orchestration plumbing and toward building product-specific behavior.
- Long-running agents need context compaction and asynchronous shell handling; otherwise they get stuck on real-world tasks that take time.
- The demo's task-tracker example shows a practical product pattern: assign work to an agent, upload files, let it inspect/edit them in a sandbox, then return a result.

## Questions To Explore

- When should I use hosted shell directly versus the full Agents SDK?
- What is the cleanest way to store and version skills for a personal or team workflow?
- How should secrets be handled when the agent is using an external sandbox?
- Which sandbox backend is best for a small app: local Docker, Modal, E2B, Cloudflare, Vercel, or another provider?
- How does session rehydration work in practice when files have changed or a task spans many hours?
- Could this daily learning app use a skill that defines my preferred note style and post style?

## Useful Examples, Tools, Or Links

- OpenAI Agents SDK: the main framework discussed in the session.
- Responses API hosted shell: lightweight container-backed execution for file-based tasks.
- Skills API: central storage/versioning for reusable agent skills.
- Docker sandbox: local development option shown in the demo.
- GitHub skill repositories: useful for versioning and reviewing changes to skills.
- Agentic task tracker demo: example pattern for assigning work to agents with uploaded files.

## Optional Post Draft

Title ideas:

- Agents are becoming less like chatbots and more like workers
- The interesting part of Agents SDK is the sandbox
- Why production agents need more than a tool loop

Draft:

The OpenAI Build Hour on Agents SDK made one thing clear: building useful agents is no longer just about calling an LLM in a loop.

The hard parts are more practical:

- where the agent works
- how it edits files
- how it survives long tasks
- how you isolate compute
- how you add reusable domain knowledge
- how you resume after a sandbox dies

The architecture I liked most: split the harness from the compute. Let the sandbox be disposable, but keep orchestration and state somewhere durable.

That feels like the difference between a demo agent and something you can actually put into a product.
