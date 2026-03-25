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
      "command": "node",
      "args": ["/path/to/ractermx-mcp/src/index.js"],
      "env": {
        "RACTERMX_API_KEY": "sk_your_key_here"
      }
    }
  }
}
```

## Available Tools (47 total)

All tools target the V2 API (`/api/v2`).

### Domains (8)
- `list_domains` — List all forwarding domains
- `get_domain` — Get domain details
- `add_domain` — Add a new domain
- `update_domain` — Update domain settings (active, catch-all, max aliases)
- `delete_domain` — Remove a domain
- `verify_domain_dns` — Trigger DNS verification
- `get_domain_dns_records` — Get required DNS records
- `get_domain_statistics` — Get email stats

### Domain Security / DoSPM (6)
- `get_security_checks` — Get all security check results grouped by pillar
- `get_security_score` — Get latest posture score and grade
- `trigger_security_scan` — Trigger an on-demand security scan (1/hr rate limit)
- `get_security_history` — Get score history (last 90 days)
- `apply_security_fix` — Apply a suggested zone fix for a finding
- `acknowledge_drift` — Acknowledge a drift event and update baseline

### DNS Zone Records (4)
- `list_zone_records` — List all DNS zone records for a domain
- `create_zone_record` — Create a new DNS record (A, AAAA, CNAME, MX, TXT, SRV, etc.)
- `update_zone_record` — Update an existing DNS record (identify by old values, replace with new)
- `delete_zone_record` — Delete a DNS record (identify by name, type, content)

### Aliases (5)
- `list_aliases` — List aliases for a domain
- `get_alias` — Get alias details
- `create_alias` — Create a new alias
- `update_alias` — Update an alias
- `delete_alias` — Delete an alias

### Email Logs (2)
- `list_email_logs` — Search email logs with filters
- `get_email_log` — Get a specific log entry

### Email Sending (1)
- `send_email` — Send an email

### Webhooks (7)
- `list_webhooks` — List webhook endpoints
- `create_webhook` — Create a webhook
- `update_webhook` — Update a webhook
- `delete_webhook` — Delete a webhook
- `test_webhook` — Send a test event
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

### SMTP Credentials (4)
- `list_smtp_credentials` — List SMTP credentials for a domain
- `create_smtp_credential` — Create SMTP credentials
- `delete_smtp_credential` — Delete SMTP credentials
- `reset_smtp_password` — Reset SMTP credential password

### Retention Policy (2)
- `get_retention_policy` — View retention settings
- `update_retention_policy` — Update retention (metadata days, content days, per-event overrides)

### Anonymous Replies (2)
- `list_anonymous_replies` — List anonymous reply proxies
- `disable_anonymous_reply` — Disable a proxy address
