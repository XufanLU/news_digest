---
title: "How Abridge uses GPT-5.5 for clinical decision support"
channel: "OpenAI"
video_url: "https://www.youtube.com/watch?v=tXBRYPpIvms"
published: "2026-05-28T18:11:11+00:00"
transcript: "transcripts/clean/tXBRYPpIvms.txt"
status: "generated"
---

# How Abridge uses GPT-5.5 for clinical decision support

## What This Is About

This short OpenAI customer clip explains how Abridge uses GPT-5.5 for clinical decision support. The core idea is that better reasoning and tool use let the system synthesize medical knowledge, patient context, and live doctor-patient conversation into denser information at the point of care, while leaving the final decision with clinicians.

## Important Concepts

- Clinical decision support: AI is used to help clinicians reason through patient care, not to replace the clinician's final judgment.
- Tool use: Abridge reports that GPT-5.5 performed better as more tools were added, suggesting stronger synthesis across information sources.
- Information density: The product goal is to surface the highest-value medical context at the moment a clinician needs it.
- Patient context: Useful clinical AI needs more than generic medical knowledge; it also needs the patient's record and live conversation context.
- Evaluation set: Abridge measured model behavior on its own clinical evaluation set, where it saw improved reasoning and tool use.

## Learning Takeaways

- In high-stakes domains, the value of a model is not just raw answer quality; it is whether it can use tools and context reliably under real workflow constraints.
- Medicine is a good example of why context windows, retrieval, and tool orchestration matter. The model has to combine many dense sources without losing rigor.
- The clip frames AI as a decision-support layer, which is an important product positioning choice for healthcare.
- The most interesting claim is that performance improved as tool count increased. That suggests the model may handle complex tool ecosystems better than previous generations.

## Questions To Explore

- What kinds of tools did Abridge add: guideline search, EHR retrieval, medication databases, lab interpretation, or note review?
- How does Abridge evaluate clinical reasoning quality and safety?
- What guardrails ensure that clinicians understand evidence, uncertainty, and source provenance?
- How does the system handle contradictory patient context or outdated medical information?
- Where is the boundary between "decision support" and making a clinical recommendation?

## Useful Examples, Tools, Or Links

- Abridge: healthcare AI company focused on clinical documentation and decision support.
- GPT-5.5: the model mentioned in the clip as improving clinical reasoning and tool use.
- Point-of-care workflows: a useful lens for evaluating whether AI output is timely and actionable.
- Clinical evaluation sets: worth studying as a pattern for testing AI systems in specialized domains.

## Optional Post Draft

Title ideas:

- Why healthcare AI is really about context
- Abridge + GPT-5.5: clinical AI as decision support
- The interesting part is not the answer, it is tool use

Draft:

Abridge's use case is a good reminder that healthcare AI is not just "ask a model a medical question."

The hard part is synthesis: medical knowledge + patient context + live doctor-patient conversation + tools, all at the point of care.

The most interesting signal from the clip: as Abridge added more tools, GPT-5.5 performed better on their evaluation set. That matters because real healthcare workflows are tool-heavy and context-heavy.

The positioning is also careful: AI supports clinicians, but clinicians still make the final decision.
