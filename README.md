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
      "args": ["@ractermx/mcp-server"],
      "env": {
        "RACTERMX_API_KEY": "sk_your_key_here"
      }
    }
  }
}
```

## Available Tools (60 total)

All tools target the V2 API (`/api/v2`).

### Dashboard & Statistics (5)
- `get_dashboard` — Dashboard statistics overview
- `get_statistics` — Aggregated email statistics with optional date range
- `get_daily_statistics` — Daily email statistics breakdown
- `get_statistics_by_domain` — Email statistics grouped by domain
- `get_quota` — Account quota and usage limits

### Domains (9)
- `list_domains` — List all forwarding domains
- `get_domain` — Get domain details
- `add_domain` — Add a new domain
- `update_domain` — Update domain settings (active, monitoring, catch-all, max aliases)
- `delete_domain` — Remove a domain and all its aliases
- `verify_domain_dns` — Trigger DNS verification
- `get_domain_dns_records` — Get required DNS records (MX, SPF, DKIM, DMARC)
- `get_domain_statistics` — Get email stats for a domain
- `get_domain_health` — Get domain health dashboard (SPF/DKIM/DMARC/MX status)

### Security Posture (8)
- `get_security_checks` — Get all security check results grouped by pillar
- `get_security_score` — Get posture score and grade with pillar breakdown
- `trigger_security_scan` — Trigger an on-demand security scan
- `get_security_history` — Get posture score history (up to 365 days)
- `apply_security_fix` — Apply a suggested zone fix for a finding
- `acknowledge_drift` — Acknowledge a DNS drift event
- `get_check_catalog` — Get the full check catalog grouped by pillar
- `set_check_override` — Override check enabled/severity per domain

### DNS Zone Records (4)
- `list_zone_records` — List all DNS zone records (DNS-hosted domains)
- `create_zone_record` — Create a DNS record
- `update_zone_record` — Update a DNS record
- `delete_zone_record` — Delete a DNS record

### Aliases (7)
- `list_aliases` — List aliases for a domain
- `get_alias` — Get alias details
- `create_alias` — Create a new alias
- `update_alias` — Update an alias
- `delete_alias` — Delete an alias
- `get_alias_statistics` — Get per-alias forwarding statistics
- `export_aliases` — Export aliases as CSV

### Email Logs (2)
- `list_email_logs` — Search email logs with filters (including full-text search)
- `get_email_log` — Get a specific log entry

### Email Sending (1)
- `send_email` — Send an email

### Webhooks (9)
- `list_webhooks` — List webhook endpoints
- `create_webhook` — Create a webhook
- `update_webhook` — Update a webhook
- `delete_webhook` — Delete a webhook
- `test_webhook` — Send a test event
- `get_webhook_secret` — Reveal the signing secret
- `rotate_webhook_secret` — Rotate the signing secret
- `list_webhook_delivery_logs` — View delivery history
- `retry_webhook_delivery` — Retry a failed delivery

### Blocklist (3)
- `list_blocklist` — List blocked senders
- `add_blocklist_entry` — Block a sender/pattern
- `remove_blocklist_entry` — Unblock a sender

### API Keys (3)
- `list_api_keys` — List active keys
- `create_api_key` — Create a new key with granular scopes
- `revoke_api_key` — Revoke a key

### SMTP Credentials (5)
- `list_smtp_credentials` — List SMTP credentials for a domain
- `create_smtp_credential` — Create SMTP credentials
- `delete_smtp_credential` — Delete SMTP credentials
- `reset_smtp_password` — Reset SMTP credential password
- `set_smtp_reply_from` — Set custom reply-from alias for anonymous replies

### Retention Policy (2)
- `get_retention_policy` — View retention settings
- `update_retention_policy` — Update retention (metadata days, per-event overrides)

### Anonymous Replies (2)
- `list_anonymous_replies` — List anonymous reply proxies
- `disable_anonymous_reply` — Disable a proxy address
