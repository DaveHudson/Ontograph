# Ontograph TAM & Revenue Analysis

## Executive Summary

Ontograph sits at the intersection of two growing markets: **ontology management tools** (~$2.7B semantic web market in 2025, growing at 23% CAGR) and **AI agent infrastructure** ($52B projected by 2030). However, Ontograph's addressable slice is narrow — it targets individual AI researchers and engineers building ontologies via natural language, not enterprises managing massive knowledge graphs.

**Key insight:** Ontograph has **zero LLM costs** — it hooks into users' own AI subscriptions (Claude Code Max, OpenAI Codex, Cursor, etc.). This eliminates the biggest variable cost in AI tooling and enables a dramatically simpler pricing model.

**Recommendation:** Open-core freemium model. Free tier for individual use, paid tier ($15–29/mo) for sync, versioning, ontology evaluation, and AI agent test beds. Realistic Year 1 revenue target: $50K–150K ARR. This is a small but defensible niche that could grow significantly if AI agent ontography adoption accelerates.

---

## Market Landscape

### Broader Markets

| Market                     | 2025 Size | Projected      | CAGR  |
| -------------------------- | --------- | -------------- | ----- |
| Semantic Web               | $2.71B    | $7.73B (2030)  | 23.3% |
| Enterprise Knowledge Graph | $2.89B    | $13.37B (2033) | 21.3% |
| AI Agents                  | $7.7B     | $52.6B (2030)  | 46%+  |

### Ontograph's Niche

Ontograph is **not** competing with enterprise platforms like TopBraid EDG, PoolParty, or Semaphore (which charge $10K–100K+/yr for enterprise governance). Instead, it occupies the gap between:

* **Protégé** (free, open source, powerful but complex, desktop-based, no AI assistance)
* **Enterprise platforms** (PoolParty, TopBraid EDG — too expensive and complex for individual researchers)

This gap — **AI-assisted ontology creation for individual practitioners** — is currently unserved.

### Comparable Niche Developer Tools

| Product                     | Model                    | Revenue             |
| --------------------------- | ------------------------ | ------------------- |
| Carrd (website builder)     | Free + $19-49/yr premium | $1M+ ARR            |
| Castmagic (AI podcast tool) | Freemium                 | $30K+ MRR in Year 1 |
| Lavender (AI email)         | Freemium                 | $5M+ ARR            |

These are niche developer/creator tools that found paying audiences with freemium models. Ontograph's market is smaller than any of these, but the pattern holds.

---

## TAM Estimation

### Bottom-Up Calculation

**Target users:** AI researchers and engineers who work with ontologies, knowledge graphs, or structured domain modeling for AI systems.

* Global AI/ML engineers: ~500K–1M (various estimates)
* % who work with ontologies/knowledge graphs: ~5–10%
* Addressable practitioners: **25K–100K**
* % willing to pay for tooling: ~5–10%
* Paying users: **1,250–10,000**
* Average revenue per user: $20/mo = $240/yr

**Bottom-up TAM: $300K – $2.4M/yr**

### Growth Catalysts

The TAM could expand significantly if:

1. **AI agent ontography takes off** — 2026 industry commentary increasingly positions ontologies as essential for trustworthy agentic AI.
2. **80% of enterprise apps embedding agents by 2026** — each needs domain models, creating demand for ontology tooling that's accessible to non-specialists.
3. **Natural language ontology creation** lowers the barrier, expanding the user base beyond semantic web specialists to general AI engineers.
4. **Multi-tool support** — supporting Claude Code, OpenAI Codex, Cursor CLI, OpenCode CLI, and other AI coding tools maximizes the addressable user base.

If the AI agent wave drives mainstream ontology adoption, TAM could 5–10x to **$1.5M–$24M/yr** within 3–5 years.

---

## Zero LLM Cost Advantage

Unlike most AI SaaS products, Ontograph does **not** pay for LLM inference. Users bring their own AI subscriptions — Claude Code Max, OpenAI Codex, Cursor, etc. This has major implications:

1. **No usage-based cost scaling** — margins stay high regardless of user activity.
2. **No need for usage caps or credit systems** — simplifies pricing dramatically.
3. **No vendor lock-in to a single LLM provider** — users choose their preferred tool.
4. **Marketing differentiator** — "Use with your existing AI subscription" is a powerful message vs. competitors that charge for AI features.
5. **Higher margins** — the primary costs are sync infrastructure and standard SaaS hosting, not per-request LLM API fees.

This model means paid tiers are gated on **value-add features** (sync, versioning, eval), not on LLM compute.

---

## Revenue Model Recommendation

### Open-Core Freemium

**Free Tier (core product, open source):**

* Create and edit ontologies via natural language (using user's own AI subscription)
* Export to standard formats (OWL, RDF, JSON-LD)
* Local/single-user use
* Works with Claude Code, OpenAI Codex, Cursor CLI, OpenCode CLI
* Community support

**Pro Tier ($15/mo or $149/yr):**

* Cloud sync and versioning
* Ontology diff between versions
* Ontology validation and consistency checks
* Evaluation dashboard — compare ontology versions side-by-side
* Import from existing ontologies (OWL, Protégé files)
* Priority support

**Team Tier ($29/mo per seat or $290/yr):**

* Collaborative editing
* API access for CI/CD integration
* **AI Agent Test Bed** — verify answer quality with and without ontology, compare across ontology versions
* Ontology merge workflows
* Admin controls

### Why This Model

1. **Open source builds trust** with the AI research community — this audience is allergic to vendor lock-in.
2. **Freemium captures the long tail** — most users won't pay, but the free tier builds community, word-of-mouth, and ecosystem.
3. **Paid tiers target real pain** — versioning, evaluation, and AI agent test beds are features teams will pay for once ontologies become production infrastructure.
4. **Zero LLM cost = near-pure SaaS margins** — no usage-based cost scaling means we can price on value, not compute.

### Pricing Rationale

* Enterprise tools charge $10K+/yr — we're 10–100x cheaper, removing the price objection entirely.
* Developer tools in this range ($15–29/mo) have proven conversion in adjacent niches.
* Micro-SaaS profit margins of 80–95% are achievable — and even higher than typical AI SaaS since we carry no LLM costs.

---

## Marketing: Key Messages

1. **"Use with your existing AI subscription"** — no additional AI costs, works with Claude Code Max, OpenAI Codex, Cursor, and more.
2. **"Ontologies for AI agents, built in natural language"** — accessible to engineers who aren't ontology specialists.
3. **"Test your AI agent's answers with and without ontology"** — the test bed feature makes the value concrete and measurable.
4. **"10–100x cheaper than enterprise tools"** — price positioning against TopBraid/PoolParty.
5. **"Open source core, no lock-in"** — trust signal for the research community.

### Supported AI Tools (Marketing Priority)

* **Claude Code** (current) — primary integration
* **OpenAI Codex** — high priority, large user base
* **Cursor CLI** — popular among developers
* **OpenCode CLI** — growing open-source alternative
* Additional tools as the ecosystem evolves

---

## Revenue Projections (Conservative)

| Metric               | Year 1   | Year 2   | Year 3    |
| -------------------- | -------- | -------- | --------- |
| Free users           | 2,000    | 8,000    | 20,000    |
| Paid conversion rate | 3%       | 4%       | 5%        |
| Paying users         | 60       | 320      | 1,000     |
| Avg revenue/user/yr  | $200     | $220     | $240      |
| **ARR**              | **$12K** | **$70K** | **$240K** |

These are conservative estimates. If AI agent ontography hits an inflection point, multiply by 3–5x. Note: margins will be higher than typical AI SaaS due to zero LLM costs.

---

## Risks

1. **Market may stay niche** — ontologies could remain a specialist concern, limiting growth.
2. **LLM providers could add ontology features** — OpenAI, Anthropic, or Google could build ontology tooling into their platforms.
3. **Enterprise incumbents could go downmarket** — PoolParty or TopBraid could release affordable individual tiers.
4. **Open source commoditization** — if Protégé adds AI features, our differentiation narrows.

## Opportunities

1. **First mover in AI-native ontology tooling** — no current tool combines NL ontology creation with modern UX.
2. **Community-driven growth** — AI researchers share tools heavily; one viral adoption moment could be transformative.
3. **Enterprise upsell path** — teams that start with Ontograph Pro could become enterprise accounts as AI governance requirements grow.
4. **Marketplace/templates** — a library of pre-built domain ontologies could become a secondary revenue stream.
5. **Multi-tool ecosystem** — supporting all major AI coding tools maximizes addressable market and reduces platform risk.

---

## Bottom Line

This is likely a **small but real market**. The freemium approach with paid tiers is the right call. It keeps the product accessible (building community and credibility) while capturing revenue from power users and teams.

The **zero LLM cost model** is a significant structural advantage — it means near-pure SaaS margins, simpler pricing, and a compelling marketing message ("use with your existing AI subscription"). Paid tiers should focus on **sync, versioning, ontology evaluation, and AI agent test beds** — features that deliver clear value without requiring us to subsidize compute.

The upside scenario — where AI agent ontography becomes mainstream — is plausible given 2026 industry trends, and Ontograph would be well-positioned as the accessible, AI-native entry point. Even in the base case, $100K–240K ARR by Year 3 is achievable with modest marketing spend, making this a sustainable micro-SaaS.
