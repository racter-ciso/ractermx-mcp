# @ractermx/mcp-server

MCP server for managing RacterMX email forwarding via AI assistants.

## Setup

```bash
npm install
```

## Configuration

Set environment variables:

- `RACTERMX_API_KEY` (required) — your `sk_*` API key from RacterMX
- `RACTERMX_API_URL` (optional) — defaults to `https://ractermx.com`

## Usage with Kiro / Claude Desktop

Add to your MCP config:

```json
{
  "mcpServers": {
    "ractermx": {
      "command": "npx",
      "args": ["-y", "@ractermx/mcp-server"],
      "env": {
        "RACTERMX_API_KEY": "sk_your_key_here"
      }
    }
  }
}
```

## Available Tools (111 total)

All tools target the V2 API (`/api/v2`).

### Required API Key Scopes

Each tool group requires specific scopes on your API key:

| Tool Group | Required Scope |
|-----------|---------------|
| Dashboard, Statistics, Email Logs, Search, Quota, Rate Limit | `email:read` |
| Email Sending | `email:send` |
| Domains, Tags, Organizations, Verification, Transfers, Security, Check Catalog, Reputation, DMARC | `domains:read` / `domains:manage` |
| Aliases | `aliases:read` / `aliases:manage` |
| SMTP Credentials, Anonymous Replies | `smtp:read` / `smtp:manage` |
| Webhooks | `webhooks:read` / `webhooks:manage` |
| Blocklist | `blocklist:read` / `blocklist:manage` |
| API Keys, Compliance Export | `api-keys:manage` |
| Retention Policy | `retention:read` / `retention:manage` |
| DNS Zone Records | `dns-zone:read` / `dns-zone:manage` |
| Notifications | `notifications:read` / `notifications:manage` |
| Alert Rules | `alerts:read` / `alerts:manage` |

Create an API key with all 21 scopes for full access, or limit to specific scopes for restricted integrations.

### Dashboard & Statistics (5)
- `get_dashboard` — Dashboard statistics overview
- `get_statistics` — Aggregated email statistics
- `get_daily_statistics` — Daily breakdown for charts
- `get_statistics_by_domain` — Stats grouped by domain
- `get_quota` — Account quota and usage limits

### Domains (9)
- `list_domains` — List all forwarding domains
- `get_domain` — Get domain details
- `add_domain` — Add a new domain
- `update_domain` — Update domain settings
- `delete_domain` — Remove a domain
- `verify_domain_dns` — Trigger DNS verification
- `get_domain_dns_records` — Get required DNS records
- `get_domain_statistics` — Get per-domain email stats
- `get_domain_health` — SPF/DKIM/DMARC/MX status

### Domain Wildcard (2)
- `enable_wildcard` — Enable wildcard subdomain forwarding
- `disable_wildcard` — Disable wildcard subdomain forwarding

### Domain Tags (6)
- `list_tags` — List all tags
- `create_tag` — Create a tag
- `update_tag` — Update a tag
- `delete_tag` — Delete a tag
- `assign_tags_to_domain` — Assign tags to a domain
- `remove_tag_from_domain` — Remove a tag from a domain

### Domain Notification Preferences (2)
- `get_notification_preferences` — Get mute/unmute settings
- `set_notification_preferences` — Set mute/unmute settings

### Domain Transfers (2)
- `initiate_domain_transfer` — Initiate a transfer
- `cancel_domain_transfer` — Cancel a pending transfer

### Organizations (10)
- `list_organizations` — List org tree (with optional domains/scores)
- `create_organization` — Create a child org
- `update_organization` — Rename or reparent
- `delete_organization` — Delete an org
- `list_organization_members` — List members
- `invite_to_organization` — Invite a user
- `remove_organization_member` — Remove a member
- `list_organization_domains` — List domains in an org
- `move_domain_to_organization` — Move a domain
- `bulk_move_domains` — Move multiple domains

### Domain Security / DoSPM (8)
- `get_security_checks` — All check results grouped by pillar
- `get_security_score` — Latest posture score and grade
- `trigger_security_scan` — On-demand scan (1/hr rate limit)
- `get_security_history` — Score history (up to 365 days)
- `apply_security_fix` — Apply suggested zone fix
- `acknowledge_drift` — Acknowledge drift event
- `get_check_catalog` — Full check catalog
- `set_check_override` — Override check severity per domain

### DNS Zone Records (4)
- `list_zone_records` — List all zone records
- `create_zone_record` — Create a DNS record
- `update_zone_record` — Update a DNS record
- `delete_zone_record` — Delete a DNS record

### Aliases (8)
- `list_aliases` — List aliases for a domain
- `list_all_aliases` — Global alias list across all domains
- `get_alias` — Get alias details
- `create_alias` — Create a new alias
- `update_alias` — Update an alias
- `delete_alias` — Delete an alias
- `get_alias_statistics` — Per-alias statistics
- `export_aliases` — Export aliases as CSV
- `bulk_update_aliases` — Bulk enable/disable or change forward_to

### Email Logs (2)
- `list_email_logs` — Search email logs with filters
- `get_email_log` — Get a specific log entry

### Email Sending (1)
- `send_email` — Send an email

### Webhooks (9)
- `list_webhooks` — List webhook endpoints
- `create_webhook` — Create a webhook
- `update_webhook` — Update a webhook
- `delete_webhook` — Delete a webhook
- `test_webhook` — Send a test event
- `get_webhook_secret` — Get signing secret
- `rotate_webhook_secret` — Rotate signing secret
- `list_webhook_delivery_logs` — View delivery history
- `retry_webhook_delivery` — Retry a failed delivery

### Blocklist (3)
- `list_blocklist` — List blocked senders
- `add_blocklist_entry` — Block a sender/pattern
- `remove_blocklist_entry` — Unblock a sender

### API Keys (3)
- `list_api_keys` — List active keys
- `create_api_key` — Create a new key
- `revoke_api_key` — Revoke a key

### SMTP Credentials (5)
- `list_smtp_credentials` — List SMTP credentials
- `create_smtp_credential` — Create SMTP credentials
- `delete_smtp_credential` — Delete SMTP credentials
- `reset_smtp_password` — Reset password
- `set_smtp_reply_from` — Set reply-from alias

### Retention Policy (2)
- `get_retention_policy` — View retention settings
- `update_retention_policy` — Update retention

### Anonymous Replies (2)
- `list_anonymous_replies` — List proxy addresses
- `disable_anonymous_reply` — Disable a proxy

### Notifications (4)
- `list_notifications` — List dashboard notifications
- `mark_notification_read` — Mark one as read
- `mark_all_notifications_read` — Mark all as read
- `delete_notification` — Delete a notification

### Reputation (6)
- `get_reputation_score` — Composite score and grade
- `get_reputation_blacklists` — Current and historical listings
- `get_reputation_deliverability` — Bounce/spam/rejection metrics
- `get_reputation_ips` — Per-IP reputation data
- `get_reputation_trends` — Time-series charts data
- `get_reputation_recommendations` — Actionable recommendations

### DMARC (6)
- `list_dmarc_reports` — List aggregate reports
- `get_dmarc_report` — Full report detail with records
- `get_dmarc_sources` — Source analysis (who sends as you)
- `get_dmarc_compliance` — Compliance rate and recommendations
- `export_dmarc_report` — Export report as XML
- `apply_dmarc_policy` — Change DMARC policy (none/quarantine/reject)

### Alert Rules (7)
- `list_alert_rules` — List rules
- `create_alert_rule` — Create a rule
- `get_alert_rule` — Get rule details
- `update_alert_rule` — Update a rule
- `delete_alert_rule` — Delete a rule
- `get_alert_rule_history` — Firing history
- `test_alert_rule` — Send test alert

### Compliance Export (2)
- `trigger_compliance_export` — Trigger export (1/24hr)
- `get_compliance_export_status` — Check status/download URL

### Search & Rate Limits (2)
- `search` — Unified search across domains, aliases, logs
- `get_rate_limit_status` — Current API rate limit status
