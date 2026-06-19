#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.RACTERMX_API_URL || "https://ractermx.com";
const API_KEY = process.env.RACTERMX_API_KEY;

if (!API_KEY) {
  console.error("RACTERMX_API_KEY environment variable is required");
  process.exit(1);
}

// ── HTTP helpers ──

async function api(method, path, body = null) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `API ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`
    );
  }
  return data;
}

function v2(method, path, body) {
  return api(method, `/api/v2${path}`, body);
}

function result(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ── Server ──

const server = new McpServer({
  name: "ractermx",
  version: "3.0.0",
});

// ═══════════════════════════════════════════════════════════════════
// Dashboard & Statistics
// ═══════════════════════════════════════════════════════════════════

server.registerTool("get_dashboard", {
  description: "Get dashboard statistics overview for your account",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/dashboard")));

server.registerTool("get_statistics", {
  description: "Get aggregated email statistics with optional date range",
  inputSchema: {
    date_from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    date_to: z.string().optional().describe("End date (YYYY-MM-DD)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ date_from, date_to }) => {
  const qs = new URLSearchParams();
  if (date_from) qs.set("date_from", date_from);
  if (date_to) qs.set("date_to", date_to);
  const q = qs.toString();
  return result(await v2("GET", `/statistics${q ? "?" + q : ""}`));
});

server.registerTool("get_daily_statistics", {
  description: "Get daily email statistics breakdown for charts",
  inputSchema: {
    date_from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    date_to: z.string().optional().describe("End date (YYYY-MM-DD)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ date_from, date_to }) => {
  const qs = new URLSearchParams();
  if (date_from) qs.set("date_from", date_from);
  if (date_to) qs.set("date_to", date_to);
  const q = qs.toString();
  return result(await v2("GET", `/statistics/daily${q ? "?" + q : ""}`));
});

server.registerTool("get_statistics_by_domain", {
  description: "Get email statistics grouped by domain",
  inputSchema: {
    date_from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    date_to: z.string().optional().describe("End date (YYYY-MM-DD)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ date_from, date_to }) => {
  const qs = new URLSearchParams();
  if (date_from) qs.set("date_from", date_from);
  if (date_to) qs.set("date_to", date_to);
  const q = qs.toString();
  return result(await v2("GET", `/statistics/by-domain${q ? "?" + q : ""}`));
});

server.registerTool("get_quota", {
  description: "Get current account quota and usage limits",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/quota")));

// ═══════════════════════════════════════════════════════════════════
// Domain tools
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_domains", {
  description: "List all email forwarding domains in your account",
  inputSchema: {
    per_page: z.number().optional().describe("Results per page (default 15)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ per_page }) => {
  const qs = per_page ? `?per_page=${per_page}` : "";
  return result(await v2("GET", `/domains${qs}`));
});

server.registerTool("get_domain", {
  description: "Get details of a specific domain including DNS records and statistics",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}`)));

server.registerTool("add_domain", {
  description: "Add a new forwarding domain to your account",
  inputSchema: {
    name: z.string().describe("Domain name (e.g. example.com)"),
    catch_all_enabled: z.boolean().optional().describe("Enable catch-all forwarding"),
    catch_all_forward_to: z.string().optional().describe("Email to forward catch-all mail to"),
    max_aliases: z.number().optional().describe("Maximum aliases allowed (1-1000, default 100)"),
  },
}, async ({ name, catch_all_enabled, catch_all_forward_to, max_aliases }) => {
  const body = { name };
  if (catch_all_enabled !== undefined) body.catch_all_enabled = catch_all_enabled;
  if (catch_all_forward_to) body.catch_all_forward_to = catch_all_forward_to;
  if (max_aliases !== undefined) body.max_aliases = max_aliases;
  return result(await v2("POST", "/domains", body));
});

server.registerTool("update_domain", {
  description: "Update a domain's settings (active status, monitoring, catch-all, max aliases)",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    is_active: z.boolean().optional().describe("Enable or disable the domain"),
    is_monitored: z.boolean().optional().describe("Enable or disable security monitoring"),
    catch_all_enabled: z.boolean().optional().describe("Enable or disable catch-all"),
    catch_all_forward_to: z.string().optional().describe("Catch-all forward address"),
    max_aliases: z.number().optional().describe("Maximum aliases allowed (1-1000)"),
  },
}, async ({ domain_id, ...updates }) => {
  const body = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) body[k] = v;
  }
  return result(await v2("PATCH", `/domains/${domain_id}`, body));
});

server.registerTool("delete_domain", {
  description: "Remove a domain and all its aliases from your account",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { destructiveHint: true },
}, async ({ domain_id }) => result(await v2("DELETE", `/domains/${domain_id}`)));

server.registerTool("verify_domain_dns", {
  description: "Trigger DNS verification for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
}, async ({ domain_id }) => result(await v2("POST", `/domains/${domain_id}/verify-dns`)));

server.registerTool("get_domain_dns_records", {
  description: "Get required DNS records for a domain (MX, SPF, DKIM, DMARC)",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/dns-records`)));

server.registerTool("get_domain_statistics", {
  description: "Get email statistics for a specific domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/statistics`)));

server.registerTool("get_domain_health", {
  description: "Get domain health dashboard showing SPF, DKIM, DMARC, and MX record status",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/health`)));

// ═══════════════════════════════════════════════════════════════════
// Domain Security (DoSPM) tools
// ═══════════════════════════════════════════════════════════════════

server.registerTool("get_security_checks", {
  description: "Get all security check results for a domain, grouped by pillar (identity, shadow, reputation). Includes fixable findings with suggested fixes for DNS-hosted domains.",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/security`)));

server.registerTool("get_security_score", {
  description: "Get the latest security posture score and grade for a domain, with pillar breakdown (identity, shadow, reputation)",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/security/score`)));

server.registerTool("trigger_security_scan", {
  description: "Trigger an on-demand security scan for a domain. Rate-limited to once per hour per domain. Domain must have monitoring enabled.",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
}, async ({ domain_id }) => result(await v2("POST", `/domains/${domain_id}/security/scan`)));

server.registerTool("get_security_history", {
  description: "Get security posture score history for a domain (up to 365 days)",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/security/history`)));

server.registerTool("apply_security_fix", {
  description: "Apply a suggested zone fix for a security finding. Only available for DNS-hosted domains with fixable findings.",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    finding_id: z.number().describe("Finding/health-check ID from security check results"),
  },
}, async ({ domain_id, finding_id }) =>
  result(await v2("POST", `/domains/${domain_id}/security/findings/${finding_id}/fix`))
);

server.registerTool("acknowledge_drift", {
  description: "Acknowledge a drift event and update the DNS baseline snapshot so it no longer appears as drift",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    event_id: z.number().describe("Drift event ID"),
  },
}, async ({ domain_id, event_id }) =>
  result(await v2("POST", `/domains/${domain_id}/security/drift/${event_id}/acknowledge`))
);

server.registerTool("get_check_catalog", {
  description: "Get the full security check catalog grouped by pillar, including tenant-level overrides",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/check-catalog")));

server.registerTool("set_check_override", {
  description: "Create or update a security check override for a domain. Allows enabling/disabling individual checks and overriding severity on a per-domain basis.",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    check_id: z.string().describe("Check ID from the check catalog"),
    enabled: z.boolean().optional().describe("Enable or disable this check for the domain"),
    severity_override: z.string().optional().describe("Override severity: critical, high, medium, low, or informational"),
  },
}, async ({ domain_id, check_id, enabled, severity_override }) => {
  const body = {};
  if (enabled !== undefined) body.enabled = enabled;
  if (severity_override) body.severity_override = severity_override;
  return result(await v2("PUT", `/domains/${domain_id}/check-overrides/${check_id}`, body));
});

// ═══════════════════════════════════════════════════════════════════
// DNS Zone Record tools
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_zone_records", {
  description: "List all DNS zone records for a domain (requires DNS hosted by RacterMX)",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/zone-records`)));

server.registerTool("create_zone_record", {
  description: "Create a new DNS zone record for a domain (requires DNS hosted by RacterMX)",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    name: z.string().describe("Record name (e.g. 'www', '@', 'mail.example.com')"),
    type: z.string().describe("Record type (A, AAAA, CNAME, MX, TXT, SRV, NS, CAA, etc.)"),
    content: z.string().describe("Record content/value"),
    ttl: z.number().describe("TTL in seconds (60-86400)"),
    priority: z.number().optional().describe("Priority (for MX/SRV records)"),
  },
}, async ({ domain_id, name, type, content, ttl, priority }) => {
  const body = { name, type, content, ttl };
  if (priority !== undefined) body.priority = priority;
  return result(await v2("POST", `/domains/${domain_id}/zone-records`, body));
});

server.registerTool("update_zone_record", {
  description: "Update an existing DNS zone record. Identifies the record by its old values and replaces with new values.",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    old_name: z.string().describe("Current record name"),
    old_type: z.string().describe("Current record type"),
    old_content: z.string().describe("Current record content"),
    new_name: z.string().describe("New record name"),
    new_type: z.string().describe("New record type"),
    new_content: z.string().describe("New record content"),
    new_ttl: z.number().describe("New TTL in seconds"),
    new_priority: z.number().optional().describe("New priority (for MX/SRV)"),
  },
}, async ({ domain_id, old_name, old_type, old_content, new_name, new_type, new_content, new_ttl, new_priority }) => {
  const old = { name: old_name, type: old_type, content: old_content };
  const nw = { name: new_name, type: new_type, content: new_content, ttl: new_ttl };
  if (new_priority !== undefined) nw.priority = new_priority;
  return result(await v2("PATCH", `/domains/${domain_id}/zone-records`, { old, new: nw }));
});

server.registerTool("delete_zone_record", {
  description: "Delete a DNS zone record from a domain. Identifies the record by name, type, and content.",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    name: z.string().describe("Record name"),
    type: z.string().describe("Record type"),
    content: z.string().describe("Record content"),
  },
  annotations: { destructiveHint: true },
}, async ({ domain_id, name, type, content }) =>
  result(await v2("DELETE", `/domains/${domain_id}/zone-records`, { name, type, content }))
);

// ═══════════════════════════════════════════════════════════════════
// Alias tools
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_aliases", {
  description: "List all email aliases for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/aliases`)));

server.registerTool("get_alias", {
  description: "Get details of a specific alias",
  inputSchema: { alias_id: z.number().describe("Alias ID") },
  annotations: { readOnlyHint: true },
}, async ({ alias_id }) => result(await v2("GET", `/aliases/${alias_id}`)));

server.registerTool("create_alias", {
  description: "Create a new email alias on a domain",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    local_part: z.string().describe("Local part of the alias (e.g. 'info' for info@domain.com)"),
    forward_to: z.string().describe("Email address to forward to"),
    is_catchall: z.boolean().optional().describe("Create as catch-all alias (uses * as local_part)"),
    description: z.string().optional().describe("Description of the alias"),
  },
}, async ({ domain_id, local_part, forward_to, is_catchall, description }) => {
  const body = { local_part, forward_to };
  if (is_catchall) body.is_catchall = true;
  if (description) body.description = description;
  return result(await v2("POST", `/domains/${domain_id}/aliases`, body));
});

server.registerTool("update_alias", {
  description: "Update an existing alias (forward_to, is_active, description)",
  inputSchema: {
    alias_id: z.number().describe("Alias ID"),
    forward_to: z.string().optional().describe("New forward-to address"),
    is_active: z.boolean().optional().describe("Enable or disable the alias"),
    description: z.string().optional().describe("Updated description"),
  },
}, async ({ alias_id, ...updates }) => {
  const body = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) body[k] = v;
  }
  return result(await v2("PATCH", `/aliases/${alias_id}`, body));
});

server.registerTool("delete_alias", {
  description: "Delete an email alias",
  inputSchema: { alias_id: z.number().describe("Alias ID") },
  annotations: { destructiveHint: true },
}, async ({ alias_id }) => result(await v2("DELETE", `/aliases/${alias_id}`)));

server.registerTool("get_alias_statistics", {
  description: "Get per-alias forwarding statistics with optional date range",
  inputSchema: {
    alias_id: z.number().describe("Alias ID"),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    days: z.number().optional().describe("Number of days to look back (default 30)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ alias_id, start_date, end_date, days }) => {
  const qs = new URLSearchParams();
  if (start_date) qs.set("start_date", start_date);
  if (end_date) qs.set("end_date", end_date);
  if (days !== undefined) qs.set("days", String(days));
  const q = qs.toString();
  return result(await v2("GET", `/aliases/${alias_id}/statistics${q ? "?" + q : ""}`));
});

server.registerTool("export_aliases", {
  description: "Export all aliases for a domain as CSV",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/aliases/export`)));

// ═══════════════════════════════════════════════════════════════════
// Email Log tools
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_email_logs", {
  description: "Search and list email logs with optional filters",
  inputSchema: {
    domain_id: z.number().optional().describe("Filter by domain ID"),
    alias_id: z.number().optional().describe("Filter by alias ID"),
    sender: z.string().optional().describe("Filter by sender address (partial match)"),
    recipient: z.string().optional().describe("Filter by recipient address (partial match)"),
    status: z.string().optional().describe("Filter by status (forwarded, bounced, rejected, spam)"),
    search: z.string().optional().describe("Full-text search across from, to, and subject"),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD), max 30 day range"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    per_page: z.number().optional().describe("Results per page (default 50)"),
  },
  annotations: { readOnlyHint: true },
}, async (params) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const q = qs.toString();
  return result(await v2("GET", `/email-logs${q ? "?" + q : ""}`));
});

server.registerTool("get_email_log", {
  description: "Get details of a specific email log entry",
  inputSchema: { log_id: z.number().describe("Email log ID") },
  annotations: { readOnlyHint: true },
}, async ({ log_id }) => result(await v2("GET", `/email-logs/${log_id}`)));

// ═══════════════════════════════════════════════════════════════════
// Email sending
// ═══════════════════════════════════════════════════════════════════

server.registerTool("send_email", {
  description: "Send an email through a configured domain",
  inputSchema: {
    from: z.string().describe("Sender address (must be an alias on a verified domain)"),
    to: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body (plain text)"),
    html: z.string().optional().describe("HTML body (optional)"),
  },
}, async ({ from, to, subject, body, html }) => {
  const payload = { from, to: [to], subject, text: body };
  if (html) payload.html = html;
  return result(await v2("POST", "/emails/send", payload));
});

// ═══════════════════════════════════════════════════════════════════
// Webhook tools
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_webhooks", {
  description: "List all webhook endpoints",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/webhooks")));

server.registerTool("create_webhook", {
  description: "Create a new webhook endpoint",
  inputSchema: {
    url: z.string().describe("Webhook URL to receive events"),
    events: z.array(z.string()).describe("Events: email.received, email.forwarded, email.bounced, email.rejected, email.spam"),
    custom_headers: z.record(z.string()).optional().describe("Custom headers to include"),
    timeout_seconds: z.number().optional().describe("Request timeout 5-30s (default 10)"),
    batch_enabled: z.boolean().optional().describe("Enable batch delivery"),
  },
}, async ({ url, events, custom_headers, timeout_seconds, batch_enabled }) => {
  const body = { url, events };
  if (custom_headers) body.custom_headers = custom_headers;
  if (timeout_seconds) body.timeout_seconds = timeout_seconds;
  if (batch_enabled !== undefined) body.batch_enabled = batch_enabled;
  return result(await v2("POST", "/webhooks", body));
});

server.registerTool("update_webhook", {
  description: "Update a webhook endpoint",
  inputSchema: {
    webhook_id: z.number().describe("Webhook ID"),
    url: z.string().optional().describe("New URL"),
    events: z.array(z.string()).optional().describe("Updated event subscriptions"),
    enabled: z.boolean().optional().describe("Enable or disable"),
  },
}, async ({ webhook_id, ...updates }) => {
  const body = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) body[k] = v;
  }
  return result(await v2("PUT", `/webhooks/${webhook_id}`, body));
});

server.registerTool("delete_webhook", {
  description: "Delete a webhook endpoint",
  inputSchema: { webhook_id: z.number().describe("Webhook ID") },
  annotations: { destructiveHint: true },
}, async ({ webhook_id }) => result(await v2("DELETE", `/webhooks/${webhook_id}`)));

server.registerTool("test_webhook", {
  description: "Send a test event to a webhook endpoint",
  inputSchema: { webhook_id: z.number().describe("Webhook ID") },
}, async ({ webhook_id }) => result(await v2("POST", `/webhooks/${webhook_id}/test`)));

server.registerTool("get_webhook_secret", {
  description: "Reveal the signing secret for a webhook endpoint",
  inputSchema: { webhook_id: z.number().describe("Webhook ID") },
  annotations: { readOnlyHint: true },
}, async ({ webhook_id }) => result(await v2("GET", `/webhooks/${webhook_id}/secret`)));

server.registerTool("rotate_webhook_secret", {
  description: "Rotate the signing secret for a webhook endpoint. The old secret will stop working immediately.",
  inputSchema: { webhook_id: z.number().describe("Webhook ID") },
}, async ({ webhook_id }) => result(await v2("POST", `/webhooks/${webhook_id}/rotate-secret`)));

server.registerTool("list_webhook_delivery_logs", {
  description: "List delivery logs for a webhook endpoint",
  inputSchema: {
    webhook_id: z.number().describe("Webhook ID"),
    status: z.string().optional().describe("Filter: success, failed, or all"),
    per_page: z.number().optional().describe("Results per page (default 50)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ webhook_id, ...params }) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const q = qs.toString();
  return result(await v2("GET", `/webhooks/${webhook_id}/delivery-logs${q ? "?" + q : ""}`));
});

server.registerTool("retry_webhook_delivery", {
  description: "Retry a failed webhook delivery",
  inputSchema: { delivery_log_id: z.number().describe("Delivery log ID") },
}, async ({ delivery_log_id }) =>
  result(await v2("POST", `/webhooks/delivery-logs/${delivery_log_id}/retry`))
);

// ═══════════════════════════════════════════════════════════════════
// Blocklist tools
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_blocklist", {
  description: "List all sender blocklist entries",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/blocklist")));

server.registerTool("add_blocklist_entry", {
  description: "Block a sender address or pattern (e.g. *@spam.com)",
  inputSchema: { pattern: z.string().describe("Email address or wildcard pattern to block") },
}, async ({ pattern }) => result(await v2("POST", "/blocklist", { pattern })));

server.registerTool("remove_blocklist_entry", {
  description: "Remove a sender from the blocklist",
  inputSchema: { entry_id: z.number().describe("Blocklist entry ID") },
  annotations: { destructiveHint: true },
}, async ({ entry_id }) => result(await v2("DELETE", `/blocklist/${entry_id}`)));

// ═══════════════════════════════════════════════════════════════════
// API Key tools
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_api_keys", {
  description: "List all active API keys",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/api-keys")));

server.registerTool("create_api_key", {
  description: "Create a new API key",
  inputSchema: {
    name: z.string().describe("Descriptive name for the key"),
    scopes: z.array(z.string()).describe("Scopes: email:read, email:send, domains:read, domains:manage, aliases:read, aliases:manage, smtp:read, smtp:manage, webhooks:read, webhooks:manage, blocklist:read, blocklist:manage, api-keys:manage, retention:read, retention:manage"),
    expires_at: z.string().optional().describe("Expiration date (ISO 8601)"),
  },
}, async ({ name, scopes, expires_at }) => {
  const body = { name, scopes };
  if (expires_at) body.expires_at = expires_at;
  return result(await v2("POST", "/api-keys", body));
});

server.registerTool("revoke_api_key", {
  description: "Revoke an API key",
  inputSchema: { key_id: z.number().describe("API key ID") },
  annotations: { destructiveHint: true },
}, async ({ key_id }) => result(await v2("DELETE", `/api-keys/${key_id}`)));

// ═══════════════════════════════════════════════════════════════════
// SMTP Credentials
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_smtp_credentials", {
  description: "List SMTP credentials for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/smtp-credentials`)));

server.registerTool("create_smtp_credential", {
  description: "Create SMTP credentials for a domain",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    daily_limit: z.number().optional().describe("Daily send limit (1-100000, default 1000)"),
  },
}, async ({ domain_id, daily_limit }) => {
  const body = {};
  if (daily_limit !== undefined) body.daily_limit = daily_limit;
  return result(await v2("POST", `/domains/${domain_id}/smtp-credentials`, body));
});

server.registerTool("delete_smtp_credential", {
  description: "Delete SMTP credentials",
  inputSchema: { credential_id: z.number().describe("SMTP credential ID") },
  annotations: { destructiveHint: true },
}, async ({ credential_id }) => result(await v2("DELETE", `/smtp-credentials/${credential_id}`)));

server.registerTool("reset_smtp_password", {
  description: "Reset the password for an SMTP credential",
  inputSchema: { credential_id: z.number().describe("SMTP credential ID") },
}, async ({ credential_id }) =>
  result(await v2("POST", `/smtp-credentials/${credential_id}/reset-password`))
);

server.registerTool("set_smtp_reply_from", {
  description: "Set a custom reply-from alias for anonymous replies on an SMTP credential",
  inputSchema: {
    credential_id: z.number().describe("SMTP credential ID"),
    reply_from_alias_id: z.number().optional().describe("Alias ID to use as reply-from, or omit/null to clear"),
  },
}, async ({ credential_id, reply_from_alias_id }) => {
  const body = { reply_from_alias_id: reply_from_alias_id ?? null };
  return result(await v2("PATCH", `/smtp-credentials/${credential_id}/reply-from`, body));
});

// ═══════════════════════════════════════════════════════════════════
// Retention Policy
// ═══════════════════════════════════════════════════════════════════

server.registerTool("get_retention_policy", {
  description: "Get the current email log retention policy",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/retention-policy")));

server.registerTool("update_retention_policy", {
  description: "Update the email log retention policy",
  inputSchema: {
    metadata_retention_days: z.number().describe("Days to retain email metadata (7-2555)"),
    event_specific_retention: z.record(z.number()).optional().describe("Per-event retention overrides (event_name → days)"),
  },
}, async ({ metadata_retention_days, event_specific_retention }) => {
  const body = { metadata_retention_days };
  if (event_specific_retention) body.event_specific_retention = event_specific_retention;
  return result(await v2("PUT", "/retention-policy", body));
});

// ═══════════════════════════════════════════════════════════════════
// Anonymous Replies
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_anonymous_replies", {
  description: "List anonymous reply proxy addresses",
  inputSchema: {
    status: z.string().optional().describe("Filter: active, expired, or disabled"),
    domain_id: z.number().optional().describe("Filter by domain ID"),
    per_page: z.number().optional().describe("Results per page (default 15)"),
  },
  annotations: { readOnlyHint: true },
}, async (params) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const q = qs.toString();
  return result(await v2("GET", `/anonymous-replies${q ? "?" + q : ""}`));
});

server.registerTool("disable_anonymous_reply", {
  description: "Disable an anonymous reply proxy address",
  inputSchema: { proxy_address: z.string().describe("The proxy email address to disable") },
}, async ({ proxy_address }) =>
  result(await v2("POST", `/anonymous-replies/${encodeURIComponent(proxy_address)}/disable`))
);

// ═══════════════════════════════════════════════════════════════════
// Domain Wildcard
// ═══════════════════════════════════════════════════════════════════

server.registerTool("enable_wildcard", {
  description: "Enable wildcard subdomain forwarding (*.domain.com) for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID of the parent domain") },
}, async ({ domain_id }) => result(await v2("POST", `/domains/${domain_id}/wildcard`)));

server.registerTool("disable_wildcard", {
  description: "Disable wildcard subdomain forwarding for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID of the parent domain") },
  annotations: { destructiveHint: true },
}, async ({ domain_id }) => result(await v2("DELETE", `/domains/${domain_id}/wildcard`)));

// ═══════════════════════════════════════════════════════════════════
// Domain Tags
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_tags", {
  description: "List all domain tags for your tenant",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/tags")));

server.registerTool("create_tag", {
  description: "Create a new domain tag",
  inputSchema: {
    name: z.string().describe("Tag name (max 50 chars)"),
    color: z.string().optional().describe("Hex color (e.g. #3b82f6)"),
  },
}, async ({ name, color }) => {
  const body = { name };
  if (color) body.color = color;
  return result(await v2("POST", "/tags", body));
});

server.registerTool("update_tag", {
  description: "Update a domain tag's name or color",
  inputSchema: {
    tag_id: z.number().describe("Tag ID"),
    name: z.string().optional().describe("New tag name"),
    color: z.string().optional().describe("New hex color"),
  },
}, async ({ tag_id, name, color }) => {
  const body = {};
  if (name) body.name = name;
  if (color) body.color = color;
  return result(await v2("PATCH", `/tags/${tag_id}`, body));
});

server.registerTool("delete_tag", {
  description: "Delete a domain tag",
  inputSchema: { tag_id: z.number().describe("Tag ID") },
  annotations: { destructiveHint: true },
}, async ({ tag_id }) => result(await v2("DELETE", `/tags/${tag_id}`)));

server.registerTool("assign_tags_to_domain", {
  description: "Assign tags to a domain (additive — does not remove existing tags)",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    tag_ids: z.array(z.number()).describe("Array of tag IDs to assign"),
  },
}, async ({ domain_id, tag_ids }) => result(await v2("POST", `/domains/${domain_id}/tags`, { tag_ids })));

server.registerTool("remove_tag_from_domain", {
  description: "Remove a tag from a domain",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    tag_id: z.number().describe("Tag ID to remove"),
  },
}, async ({ domain_id, tag_id }) => result(await v2("DELETE", `/domains/${domain_id}/tags/${tag_id}`)));

// ═══════════════════════════════════════════════════════════════════
// Domain Notification Preferences
// ═══════════════════════════════════════════════════════════════════

server.registerTool("get_notification_preferences", {
  description: "Get notification preferences (mute/unmute) for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/notification-preferences`)));

server.registerTool("set_notification_preferences", {
  description: "Set notification preferences (mute/unmute) for a domain",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    muted: z.boolean().optional().describe("Mute all notifications for this domain"),
    muted_types: z.array(z.string()).optional().describe("Array of notification types to mute"),
  },
}, async ({ domain_id, ...prefs }) => {
  const body = {};
  for (const [k, v] of Object.entries(prefs)) {
    if (v !== undefined) body[k] = v;
  }
  return result(await v2("POST", `/domains/${domain_id}/notification-preferences`, body));
});

// ═══════════════════════════════════════════════════════════════════
// Domain Transfers
// ═══════════════════════════════════════════════════════════════════

server.registerTool("initiate_domain_transfer", {
  description: "Initiate a domain transfer to another tenant",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
}, async ({ domain_id }) => result(await v2("POST", `/domains/${domain_id}/transfer`)));

server.registerTool("cancel_domain_transfer", {
  description: "Cancel a pending domain transfer",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
}, async ({ domain_id }) => result(await v2("POST", `/domains/${domain_id}/transfer/cancel`)));

// ═══════════════════════════════════════════════════════════════════
// Organizations
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_organizations", {
  description: "List organizations in your account tree. Supports ?include=domains,scores for nested data.",
  inputSchema: {
    include: z.string().optional().describe("Comma-separated: domains, scores"),
  },
  annotations: { readOnlyHint: true },
}, async ({ include }) => {
  const qs = include ? `?include=${include}` : "";
  return result(await v2("GET", `/organizations${qs}`));
});

server.registerTool("create_organization", {
  description: "Create a child organization",
  inputSchema: {
    name: z.string().describe("Organization name"),
    parent_id: z.number().describe("Parent organization ID"),
  },
}, async ({ name, parent_id }) => result(await v2("POST", "/organizations", { name, parent_id })));

server.registerTool("update_organization", {
  description: "Rename or reparent an organization",
  inputSchema: {
    org_id: z.number().describe("Organization ID"),
    name: z.string().optional().describe("New name"),
    parent_id: z.number().optional().describe("New parent organization ID"),
  },
}, async ({ org_id, name, parent_id }) => {
  const body = {};
  if (name) body.name = name;
  if (parent_id !== undefined) body.parent_id = parent_id;
  return result(await v2("PATCH", `/organizations/${org_id}`, body));
});

server.registerTool("delete_organization", {
  description: "Delete an organization (must have no domains, children, or other members)",
  inputSchema: { org_id: z.number().describe("Organization ID") },
  annotations: { destructiveHint: true },
}, async ({ org_id }) => result(await v2("DELETE", `/organizations/${org_id}`)));

server.registerTool("list_organization_members", {
  description: "List members of an organization",
  inputSchema: { org_id: z.number().describe("Organization ID") },
  annotations: { readOnlyHint: true },
}, async ({ org_id }) => result(await v2("GET", `/organizations/${org_id}/members`)));

server.registerTool("invite_to_organization", {
  description: "Invite a user to an organization (creates account if needed)",
  inputSchema: {
    org_id: z.number().describe("Organization ID"),
    email: z.string().describe("Email address to invite"),
    name: z.string().optional().describe("Display name"),
    role: z.string().optional().describe("Role: owner, user, or readonly (default: user)"),
  },
}, async ({ org_id, email, name, role }) => {
  const body = { email };
  if (name) body.name = name;
  if (role) body.role = role;
  return result(await v2("POST", `/organizations/${org_id}/invite`, body));
});

server.registerTool("remove_organization_member", {
  description: "Remove a member from an organization",
  inputSchema: {
    org_id: z.number().describe("Organization ID"),
    user_id: z.number().describe("User ID to remove"),
  },
}, async ({ org_id, user_id }) => result(await v2("DELETE", `/organizations/${org_id}/members/${user_id}`)));

server.registerTool("list_organization_domains", {
  description: "List domains in an organization",
  inputSchema: {
    org_id: z.number().describe("Organization ID"),
    include_children: z.boolean().optional().describe("Include domains from child orgs"),
    search: z.string().optional().describe("Filter domains by name"),
    per_page: z.number().optional().describe("Results per page (default 50, max 200)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ org_id, include_children, search, per_page }) => {
  const qs = new URLSearchParams();
  if (include_children) qs.set("include_children", "1");
  if (search) qs.set("search", search);
  if (per_page) qs.set("per_page", String(per_page));
  const q = qs.toString();
  return result(await v2("GET", `/organizations/${org_id}/domains${q ? "?" + q : ""}`));
});

server.registerTool("move_domain_to_organization", {
  description: "Move a domain to a different organization",
  inputSchema: {
    org_id: z.number().describe("Source organization ID"),
    domain_id: z.number().describe("Domain ID to move"),
    target_organization_id: z.number().describe("Target organization ID"),
  },
}, async ({ org_id, domain_id, target_organization_id }) =>
  result(await v2("PATCH", `/organizations/${org_id}/domains/${domain_id}/move`, { target_organization_id }))
);

server.registerTool("bulk_move_domains", {
  description: "Move multiple domains to a different organization",
  inputSchema: {
    org_id: z.number().describe("Source organization ID"),
    domain_ids: z.array(z.number()).describe("Array of domain IDs to move"),
    target_organization_id: z.number().describe("Target organization ID"),
  },
}, async ({ org_id, domain_ids, target_organization_id }) =>
  result(await v2("POST", `/organizations/${org_id}/domains/bulk-move`, { domain_ids, target_organization_id }))
);

// ═══════════════════════════════════════════════════════════════════
// Alias Import & Bulk Update
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_all_aliases", {
  description: "List all aliases across all domains (global view)",
  inputSchema: {
    search: z.string().optional().describe("Filter by local_part or forward_to"),
    domain_id: z.number().optional().describe("Filter by domain ID"),
    per_page: z.number().optional().describe("Results per page"),
  },
  annotations: { readOnlyHint: true },
}, async (params) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const q = qs.toString();
  return result(await v2("GET", `/aliases${q ? "?" + q : ""}`));
});

server.registerTool("bulk_update_aliases", {
  description: "Bulk update aliases (enable/disable, change forward_to) by IDs",
  inputSchema: {
    alias_ids: z.array(z.number()).describe("Array of alias IDs to update"),
    forward_to: z.string().optional().describe("New forward-to address for all"),
    is_active: z.boolean().optional().describe("Enable or disable all"),
  },
}, async ({ alias_ids, forward_to, is_active }) => {
  const body = { alias_ids };
  if (forward_to) body.forward_to = forward_to;
  if (is_active !== undefined) body.is_active = is_active;
  return result(await v2("POST", "/aliases/bulk-update", body));
});

// ═══════════════════════════════════════════════════════════════════
// Notifications
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_notifications", {
  description: "List dashboard notifications with optional filtering",
  inputSchema: {
    type: z.string().optional().describe("Filter by type (domain, account, security, etc.)"),
    unread: z.boolean().optional().describe("Filter to unread only"),
    per_page: z.number().optional().describe("Results per page (default 20)"),
    cursor: z.string().optional().describe("Cursor for pagination"),
  },
  annotations: { readOnlyHint: true },
}, async (params) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const q = qs.toString();
  return result(await v2("GET", `/notifications${q ? "?" + q : ""}`));
});

server.registerTool("mark_notification_read", {
  description: "Mark a single notification as read",
  inputSchema: { notification_id: z.number().describe("Notification ID") },
}, async ({ notification_id }) => result(await v2("PATCH", `/notifications/${notification_id}/read`)));

server.registerTool("mark_all_notifications_read", {
  description: "Mark all unread notifications as read",
}, async () => result(await v2("POST", "/notifications/read-all")));

server.registerTool("delete_notification", {
  description: "Delete a notification",
  inputSchema: { notification_id: z.number().describe("Notification ID") },
  annotations: { destructiveHint: true },
}, async ({ notification_id }) => result(await v2("DELETE", `/notifications/${notification_id}`)));

// ═══════════════════════════════════════════════════════════════════
// Reputation
// ═══════════════════════════════════════════════════════════════════

server.registerTool("get_reputation_score", {
  description: "Get composite outbound email reputation score, grade, and component breakdown for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/reputation`)));

server.registerTool("get_reputation_blacklists", {
  description: "Get current and historical blacklist listings for a domain",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    limit: z.number().optional().describe("Max historical entries (default 50, max 200)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ domain_id, limit }) => {
  const qs = limit ? `?limit=${limit}` : "";
  return result(await v2("GET", `/domains/${domain_id}/reputation/blacklists${qs}`));
});

server.registerTool("get_reputation_deliverability", {
  description: "Get deliverability metrics (bounce/spam/rejection rates) for a domain",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    days: z.number().optional().describe("Lookback period in days (7-90, default 30)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ domain_id, days }) => {
  const qs = days ? `?days=${days}` : "";
  return result(await v2("GET", `/domains/${domain_id}/reputation/deliverability${qs}`));
});

server.registerTool("get_reputation_ips", {
  description: "Get per-IP reputation data for a domain's sending IPs",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/reputation/ips`)));

server.registerTool("get_reputation_trends", {
  description: "Get reputation score and deliverability time-series trends for charts",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    days: z.number().optional().describe("Lookback period in days (7-90, default 90)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ domain_id, days }) => {
  const qs = days ? `?days=${days}` : "";
  return result(await v2("GET", `/domains/${domain_id}/reputation/trends${qs}`));
});

server.registerTool("get_reputation_recommendations", {
  description: "Get actionable recommendations to improve domain reputation",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/reputation/recommendations`)));

// ═══════════════════════════════════════════════════════════════════
// DMARC
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_dmarc_reports", {
  description: "List DMARC aggregate reports for a domain with optional date filtering",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    from: z.string().optional().describe("Start date (ISO 8601)"),
    to: z.string().optional().describe("End date (ISO 8601)"),
    per_page: z.number().optional().describe("Results per page (default 25, max 100)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ domain_id, from, to, per_page }) => {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (per_page) qs.set("per_page", String(per_page));
  const q = qs.toString();
  return result(await v2("GET", `/domains/${domain_id}/dmarc/reports${q ? "?" + q : ""}`));
});

server.registerTool("get_dmarc_report", {
  description: "Get full details of a DMARC report including all record rows",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    report_id: z.number().describe("DMARC report ID"),
  },
  annotations: { readOnlyHint: true },
}, async ({ domain_id, report_id }) => result(await v2("GET", `/domains/${domain_id}/dmarc/reports/${report_id}`)));

server.registerTool("get_dmarc_sources", {
  description: "Get aggregated DMARC source analysis for a domain (who is sending as you)",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    from: z.string().optional().describe("Start date (ISO 8601)"),
    to: z.string().optional().describe("End date (ISO 8601)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ domain_id, from, to }) => {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const q = qs.toString();
  return result(await v2("GET", `/domains/${domain_id}/dmarc/sources${q ? "?" + q : ""}`));
});

server.registerTool("get_dmarc_compliance", {
  description: "Get DMARC compliance rate, trend data, and policy recommendation",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    from: z.string().optional().describe("Start date (ISO 8601)"),
    to: z.string().optional().describe("End date (ISO 8601)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ domain_id, from, to }) => {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const q = qs.toString();
  return result(await v2("GET", `/domains/${domain_id}/dmarc/compliance${q ? "?" + q : ""}`));
});

server.registerTool("export_dmarc_report", {
  description: "Export a DMARC report as XML",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    report_id: z.number().describe("DMARC report ID"),
  },
  annotations: { readOnlyHint: true },
}, async ({ domain_id, report_id }) => result(await v2("GET", `/domains/${domain_id}/dmarc/export?report_id=${report_id}`)));

server.registerTool("apply_dmarc_policy", {
  description: "Apply a DMARC policy change (none, quarantine, reject) for a DNS-hosted domain",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    policy: z.string().describe("DMARC policy: none, quarantine, or reject"),
  },
}, async ({ domain_id, policy }) => result(await v2("POST", `/domains/${domain_id}/dmarc/apply-policy`, { policy })));

// ═══════════════════════════════════════════════════════════════════
// Alert Rules
// ═══════════════════════════════════════════════════════════════════

server.registerTool("list_alert_rules", {
  description: "List alert rules with optional filters",
  inputSchema: {
    domain_id: z.number().optional().describe("Filter by domain ID"),
    alert_type: z.string().optional().describe("Filter by type: deliverability_score, blacklist_change, security_posture, dmarc_compliance"),
    per_page: z.number().optional().describe("Results per page (default 15)"),
  },
  annotations: { readOnlyHint: true },
}, async (params) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const q = qs.toString();
  return result(await v2("GET", `/alert-rules${q ? "?" + q : ""}`));
});

server.registerTool("create_alert_rule", {
  description: "Create an alert rule to get notified when conditions are met",
  inputSchema: {
    domain_id: z.number().describe("Domain ID to monitor"),
    name: z.string().describe("Rule name (max 100 chars)"),
    alert_type: z.string().describe("Type: deliverability_score, blacklist_change, security_posture, dmarc_compliance"),
    condition: z.string().describe("Condition: below, above, equals, any_change"),
    threshold_value: z.string().optional().describe("Threshold (grade letter A-F for score types, integer 0-100 for dmarc)"),
    cooldown_minutes: z.number().optional().describe("Minutes between re-fires (15-1440, default 60)"),
    enabled: z.boolean().optional().describe("Whether the rule is active (default true)"),
    channels: z.array(z.object({
      channel_type: z.string().describe("Channel type: email or webhook"),
      webhook_endpoint_id: z.number().optional().describe("Webhook endpoint ID (for webhook channels)"),
      email_address: z.string().optional().describe("Email address (for email channels)"),
    })).describe("Notification channels (1-3)"),
  },
}, async ({ domain_id, name, alert_type, condition, threshold_value, cooldown_minutes, enabled, channels }) => {
  const body = { domain_id, name, alert_type, condition, channels };
  if (threshold_value) body.threshold_value = threshold_value;
  if (cooldown_minutes !== undefined) body.cooldown_minutes = cooldown_minutes;
  if (enabled !== undefined) body.enabled = enabled;
  return result(await v2("POST", "/alert-rules", body));
});

server.registerTool("get_alert_rule", {
  description: "Get details of a specific alert rule",
  inputSchema: { rule_id: z.number().describe("Alert rule ID") },
  annotations: { readOnlyHint: true },
}, async ({ rule_id }) => result(await v2("GET", `/alert-rules/${rule_id}`)));

server.registerTool("update_alert_rule", {
  description: "Update an alert rule",
  inputSchema: {
    rule_id: z.number().describe("Alert rule ID"),
    name: z.string().optional().describe("New name"),
    condition: z.string().optional().describe("New condition"),
    threshold_value: z.string().optional().describe("New threshold value"),
    cooldown_minutes: z.number().optional().describe("New cooldown (15-1440)"),
    enabled: z.boolean().optional().describe("Enable or disable"),
    channels: z.array(z.object({
      channel_type: z.string().describe("Channel type: email or webhook"),
      webhook_endpoint_id: z.number().optional().describe("Webhook endpoint ID"),
      email_address: z.string().optional().describe("Email address"),
    })).optional().describe("Replace notification channels"),
  },
}, async ({ rule_id, ...updates }) => {
  const body = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) body[k] = v;
  }
  return result(await v2("PATCH", `/alert-rules/${rule_id}`, body));
});

server.registerTool("delete_alert_rule", {
  description: "Delete an alert rule",
  inputSchema: { rule_id: z.number().describe("Alert rule ID") },
  annotations: { destructiveHint: true },
}, async ({ rule_id }) => result(await v2("DELETE", `/alert-rules/${rule_id}`)));

server.registerTool("get_alert_rule_history", {
  description: "Get firing history for an alert rule",
  inputSchema: {
    rule_id: z.number().describe("Alert rule ID"),
    per_page: z.number().optional().describe("Results per page (default 15)"),
  },
  annotations: { readOnlyHint: true },
}, async ({ rule_id, per_page }) => {
  const qs = per_page ? `?per_page=${per_page}` : "";
  return result(await v2("GET", `/alert-rules/${rule_id}/history${qs}`));
});

server.registerTool("test_alert_rule", {
  description: "Send a test alert through all configured channels for a rule",
  inputSchema: { rule_id: z.number().describe("Alert rule ID") },
}, async ({ rule_id }) => result(await v2("POST", `/alert-rules/${rule_id}/test`)));

// ═══════════════════════════════════════════════════════════════════
// Compliance Export
// ═══════════════════════════════════════════════════════════════════

server.registerTool("trigger_compliance_export", {
  description: "Trigger a tenant-wide compliance data export (ZIP). Rate limited to once per 24 hours.",
}, async () => result(await v2("POST", "/compliance-export")));

server.registerTool("get_compliance_export_status", {
  description: "Get the status and download URL of a compliance export",
  inputSchema: { export_id: z.number().describe("Compliance export ID") },
  annotations: { readOnlyHint: true },
}, async ({ export_id }) => result(await v2("GET", `/compliance-export/${export_id}`)));

// ═══════════════════════════════════════════════════════════════════
// Search & Rate Limits
// ═══════════════════════════════════════════════════════════════════

server.registerTool("search", {
  description: "Unified search across domains, aliases, and email logs",
  inputSchema: {
    q: z.string().describe("Search query"),
  },
  annotations: { readOnlyHint: true },
}, async ({ q }) => result(await v2("GET", `/search?q=${encodeURIComponent(q)}`)));

server.registerTool("get_rate_limit_status", {
  description: "Get current API rate limit status",
  annotations: { readOnlyHint: true },
}, async () => result(await v2("GET", "/rate-limit-status")));

// ═══════════════════════════════════════════════════════════════════
// Start server
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
