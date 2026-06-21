# RacterMX MCP Server — Feature List

> Model Context Protocol Server for AI Integrations  
> Source: `ractermx-mcp/`  
> Version: 3.0.0

---

## Overview

- **Total tools:** 111
- **API coverage:** 100% of V2 API endpoints
- **Protocol:** Model Context Protocol (MCP) over stdio
- **Clients:** Claude Desktop, VS Code Copilot, Cursor, any MCP-compatible client
- **Authentication:** Bearer token (API key)
- **Validation:** JSON Schema (Zod) on all tool inputs

---

## Dashboard & Statistics (5 tools)

- Account dashboard overview (total domains, verified, aliases)
- Aggregated email statistics with date range filtering
- Daily statistics breakdown for charting
- Per-domain statistics breakdown
- Account quota and usage limits

## Domain Management (11 tools)

- List all forwarding domains with pagination
- Get domain details including DNS records and statistics
- Add new forwarding domains (with catch-all, max aliases configuration)
- Update domain settings (active status, monitoring, catch-all, max aliases)
- Delete domains and all associated aliases
- Trigger DNS verification
- Get required DNS records (MX, SPF, DKIM, DMARC values to configure)
- Get per-domain email statistics
- Domain health dashboard (per-record verification status)
- Enable wildcard subdomain forwarding (`*.domain.com`)
- Disable wildcard subdomain forwarding

## Security — DoSPM (8 tools)

- Get all security check results grouped by pillar (identity, shadow, reputation)
- Get security posture score and grade with pillar breakdown
- Trigger on-demand security scan (rate-limited once per hour)
- Get security score history (up to 365 days)
- Apply suggested zone fix for a finding (automated remediation)
- Acknowledge DNS drift events and update baseline
- Get full security check catalog (versioned, grouped by pillar)
- Create/update per-domain check overrides (enable/disable, severity override)

## DNS Zone Records (4 tools)

- List all zone records for a domain
- Create DNS records (A, AAAA, CNAME, MX, TXT, SRV, NS, CAA)
- Update existing records (identify by old values, replace with new)
- Delete records (identify by name, type, content)

## Alias Management (9 tools)

- List aliases for a specific domain
- Get alias details by ID
- Create aliases (local_part, forward_to, catch-all, description)
- Update aliases (forward_to, active status, description)
- Delete aliases
- Get per-alias forwarding statistics with date range filtering
- Export all domain aliases as CSV
- List all aliases globally across all domains with search
- Bulk update aliases (enable/disable, change forward_to — up to 500)

## Email Logs (2 tools)

- Search email logs with filters (domain, alias, sender, recipient, status, date range, full-text search)
- Get detailed email log entry with full metadata

## Email Sending (1 tool)

- Send email through a configured domain (from, to, subject, body, optional HTML)

## Webhooks (9 tools)

- List all webhook endpoints
- Create webhooks (URL, events, custom headers, timeout, batch mode)
- Update webhook settings (URL, events, enabled state)
- Delete webhooks
- Send test event to an endpoint
- Reveal webhook signing secret
- Rotate webhook signing secret
- List delivery logs with status filtering and pagination
- Retry failed webhook deliveries

## Sender Blocklist (3 tools)

- List all blocklist entries
- Block a sender address or wildcard pattern (e.g., `*@spam.com`)
- Remove a blocklist entry

## API Keys (3 tools)

- List all active API keys with metadata
- Create new API keys (name, scopes, optional expiration)
- Revoke an API key

## SMTP Credentials (5 tools)

- List SMTP credentials for a domain
- Create SMTP credentials (with configurable daily limit)
- Delete SMTP credentials
- Reset SMTP password
- Set reply-from alias for anonymous reply proxying

## Retention Policy (2 tools)

- Get current email log retention policy
- Update retention policy (metadata retention days, event-specific overrides)

## Anonymous Replies (2 tools)

- List anonymous reply proxy addresses (with status and domain filtering)
- Disable an anonymous reply proxy address

## Domain Tags (6 tools)

- List all domain tags
- Create tags (name, hex color)
- Update tag name or color
- Delete tags
- Assign tags to a domain (additive)
- Remove a tag from a domain

## Notification Preferences (2 tools)

- Get per-domain notification preferences (muted status, muted types)
- Set notification preferences (mute/unmute, configure muted types)

## Domain Transfers (2 tools)

- Initiate domain transfer to another tenant
- Cancel pending domain transfer

## Organizations (9 tools)

- List organizations in account tree (with optional domain/score includes)
- Create child organizations
- Update organization (rename, reparent)
- Delete organization (must be empty)
- List organization members
- Invite user to organization (with role: owner/user/readonly)
- Remove organization member
- List domains in an organization (with child org inclusion, search)
- Move a domain to a different organization

## Bulk Operations (1 tool)

- Bulk move multiple domains between organizations

## Notifications (4 tools)

- List dashboard notifications (cursor pagination, type/unread filtering)
- Mark single notification as read
- Mark all notifications as read
- Delete notification

## Reputation Monitoring (6 tools)

- Get composite reputation score, grade, and component breakdown
- Get current and historical blacklist listings (up to 200 entries)
- Get deliverability metrics (bounce/spam/rejection rates, 7–90 day window)
- Get per-IP reputation data for sending IPs
- Get reputation score and deliverability time-series trends (7–90 days)
- Get actionable recommendations to improve domain reputation

## DMARC Analysis (6 tools)

- List DMARC aggregate reports with date filtering and pagination
- Get full report details with all record rows
- Get aggregated source analysis (who is sending as your domain)
- Get DMARC compliance rate with trend data and policy recommendation
- Export DMARC report as XML
- Apply DMARC policy change (none/quarantine/reject) for DNS-hosted domains

## Alert Rules (7 tools)

- List alert rules (with domain and type filtering)
- Create alert rules (domain, type, condition, threshold, channels, cooldown)
- Get alert rule details
- Update alert rules (name, condition, threshold, channels, enabled)
- Delete alert rules
- Get alert rule firing history
- Send test alert through all configured channels

## Compliance Export (2 tools)

- Trigger tenant-wide compliance data export (ZIP, rate-limited once per 24h)
- Get export status and download URL

## Search & Rate Limits (2 tools)

- Unified search across domains, aliases, and email logs
- Get current API rate limit status (requests used/limit, daily emails sent/limit)

---

## Technical Characteristics

- Full 1:1 mapping with V2 API (111 endpoints covered, 0 gaps)
- JSON Schema input validation on all tool arguments via Zod
- Structured error responses for all failure cases
- Bearer token authentication
- Single-file architecture (~1300 lines)
- Zero build step (plain ES module)
- Compatible with Claude Desktop, VS Code, Cursor, and any MCP client
- Published on npm as `@ractermx/mcp-server`
