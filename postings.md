# RacterMX MCP Server — Reddit Post Drafts

> Target subreddits: r/selfhosted, r/sysadmin, r/LocalLLaMA, r/ClaudeAI, r/ChatGPT

---

## Post 1: Full Email Infrastructure Management via AI

**Title:** Built an MCP server with 111 tools — manage your entire email forwarding infrastructure through Claude/AI chat

**Body:**

I've been working on RacterMX (email forwarding + security monitoring SaaS) and just shipped an MCP server that gives AI assistants full access to the platform.

111 tools covering everything:
- Domain management (add, configure, verify DNS, enable wildcard)
- Alias CRUD + bulk operations (up to 500 at once)
- Security scanning (trigger scans, view findings, apply automated fixes)
- Reputation monitoring (blacklists, deliverability, trends)
- DMARC analysis (reports, compliance, policy changes)
- DNS zone record management (all record types)
- Webhook configuration
- Organization management (hierarchical multi-tenant)
- Alert rules (deliverability, blacklist, security, DMARC thresholds)

The workflow I use daily: "Show me any domains with a security grade below B, then trigger a scan on each and tell me what's fixable." Claude reads the scores, triggers scans, shows findings with remediation, and can apply fixes for DNS-hosted domains — all in one conversation.

It's a standard MCP server (Model Context Protocol), so it works with Claude Desktop, VS Code with Copilot, or any MCP-compatible client.

Every tool has full JSON Schema input validation and returns structured errors. No guessing at parameters.

---

## Post 2: AI-Powered Security Remediation

**Title:** "Fix all critical security findings on my domains" — AI + MCP server for automated email security remediation

**Body:**

One of the more interesting use cases with the RacterMX MCP server: delegating security remediation to AI.

The flow:

1. Ask Claude: "Which of my domains have critical security findings?"
2. It calls `get_security_score` across your domains, filters by grade
3. For each domain below threshold, it calls `get_security_checks` to get findings
4. For fixable findings on DNS-hosted domains, it calls `apply_security_fix`
5. After fixes, it triggers a rescan to verify

What the AI can remediate without human intervention:
- Missing or misconfigured SPF records
- DKIM key rotation issues
- DMARC policy gaps
- Dangling DNS records

What it flags for human review:
- Unauthorized senders detected in DMARC reports
- Blacklist listings (need manual delisting requests)
- Reputation degradation from bounce rates

The security check catalog has 30+ checks across three pillars (Identity, Shadow, Reputation). Each finding includes severity, evidence, and a remediation message that the AI can reason about.

For anyone managing 10+ domains, this turns a 30-minute dashboard review into a 2-minute conversation.

---

## Post 3: Natural Language Email Ops

**Title:** Managing email aliases and forwarding rules through natural language — MCP server for email ops

**Body:**

Quick demo of what natural language email ops looks like with the RacterMX MCP server:

**"Create a support alias on every active domain that forwards to helpdesk@company.com"**

Claude:
1. Calls `list_domains` to get all domains
2. Filters for active domains
3. For each domain, calls `create_alias` with local_part "support"
4. Reports success/failure per domain

**"Show me which aliases are getting the most bounces this month"**

Claude:
1. Calls `list_all_aliases` to get the full alias list
2. Calls `get_alias_statistics` on each with this month's date range
3. Sorts by bounce count, presents top offenders

**"Disable all aliases on domains that haven't been verified yet"**

Claude:
1. Calls `list_domains`, filters unverified
2. For each, calls `list_aliases`
3. Calls `bulk_update_aliases` with `is_active: false`

The bulk operations tool supports up to 500 aliases in one call, so this scales to large deployments.

Works with Claude Desktop or any MCP client. 111 tools, full API coverage, zero gaps between what the dashboard can do and what the AI can do.

---

## Post 4: DMARC Monitoring via Conversational AI

**Title:** "Who's sending email as my domain?" — DMARC analysis through AI chat

**Body:**

DMARC reports are XML nightmares. Aggregate reports from Google, Microsoft, Yahoo — they all tell you who's sending as your domain, but reading them manually is painful.

With the RacterMX MCP server, I just ask:

**"Show me unauthorized senders for example.com in the last 30 days"**

The AI calls `get_dmarc_sources`, which returns a digested view of all senders grouped by IP and organization, with SPF/DKIM pass rates. It highlights which sources are failing authentication.

**"What's my DMARC compliance rate and should I tighten my policy?"**

Calls `get_dmarc_compliance`, gets the compliance percentage and the system's policy recommendation. If compliance is above 95% and you're still on `p=none`, it suggests moving to `quarantine`.

**"Apply reject policy on all domains with >98% compliance"**

Calls compliance check on each domain, filters qualifying ones, then calls `apply_dmarc_policy` with `policy: "reject"`. For DNS-hosted domains, it writes the DMARC TXT record directly.

This is the kind of analysis that takes 30 minutes per domain in a traditional DMARC reporting tool. With AI + MCP, it's one sentence across all your domains simultaneously.

---

## Post 5: MCP Server as Programmable Email Gateway

**Title:** Using MCP server as a programmable gateway to email infrastructure — automation without writing code

**Body:**

The RacterMX MCP server started as a way to let AI assistants manage our email platform, but it's turning into something more general: a programmable gateway for email infrastructure automation without writing custom code.

Because MCP is a standard protocol, you can connect it to:
- **Claude Desktop** — conversational management
- **VS Code Copilot** — inline infrastructure queries while coding
- **Custom scripts** — any MCP client library can call the tools programmatically
- **Automation pipelines** — trigger from webhooks, CI/CD, or scheduled tasks

Automation patterns I'm using:

**Daily security digest**: Ask "summarize security status across all domains" → AI calls scores on all domains, formats a report, sends via `send_email` tool to my inbox.

**New domain onboarding**: One prompt sets up domain + aliases + webhook + alert rule + security scan. 10 seconds of conversation replaces 5 minutes of clicking.

**Compliance audit**: "Export all domains with their security scores and DMARC compliance rates" → AI traverses the org tree, collects data, formats a report.

**Bulk cleanup**: "Find and disable all aliases forwarding to old-employee@company.com" → AI searches globally, presents matches, bulk-updates on confirmation.

The server has 111 tools covering domains, aliases, DNS, security, reputation, DMARC, webhooks, organizations, alerts, SMTP credentials, blocklists, notifications, and more. Full CRUD on every resource.

If you're building AI-powered ops tooling, email infrastructure is a surprisingly good domain for it — repetitive tasks, clear success/failure criteria, and composable operations that chain naturally.
