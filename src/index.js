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
  version: "2.2.0",
});

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
  description: "Update a domain's settings (active status, catch-all, max aliases)",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    is_active: z.boolean().optional().describe("Enable or disable the domain"),
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
  description: "Remove a domain from your account",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { destructiveHint: true },
}, async ({ domain_id }) => result(await v2("DELETE", `/domains/${domain_id}`)));

server.registerTool("verify_domain_dns", {
  description: "Trigger DNS verification for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
}, async ({ domain_id }) => result(await v2("POST", `/domains/${domain_id}/verify-dns`)));

server.registerTool("get_domain_dns_records", {
  description: "Get required DNS records for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/dns-records`)));

server.registerTool("get_domain_statistics", {
  description: "Get email statistics for a domain",
  inputSchema: { domain_id: z.number().describe("Domain ID") },
  annotations: { readOnlyHint: true },
}, async ({ domain_id }) => result(await v2("GET", `/domains/${domain_id}/statistics`)));

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
  description: "Get security posture score history for a domain (last 90 days)",
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
    priority: z.number().optional().describe("Priority (0-65535, for MX/SRV records)"),
    weight: z.number().optional().describe("Weight (0-65535, for SRV records)"),
    port: z.number().optional().describe("Port (1-65535, for SRV records)"),
  },
}, async ({ domain_id, name, type, content, ttl, priority, weight, port }) => {
  const body = { name, type, content, ttl };
  if (priority !== undefined) body.priority = priority;
  if (weight !== undefined) body.weight = weight;
  if (port !== undefined) body.port = port;
  return result(await v2("POST", `/domains/${domain_id}/zone-records`, body));
});

server.registerTool("update_zone_record", {
  description: "Update an existing DNS zone record. Identifies the record by its old values and replaces with new values.",
  inputSchema: {
    domain_id: z.number().describe("Domain ID"),
    old_name: z.string().describe("Current record name"),
    old_type: z.string().describe("Current record type"),
    old_content: z.string().describe("Current record content"),
    old_ttl: z.number().optional().describe("Current record TTL"),
    new_name: z.string().describe("New record name"),
    new_type: z.string().describe("New record type"),
    new_content: z.string().describe("New record content"),
    new_ttl: z.number().describe("New TTL in seconds (60-86400)"),
    new_priority: z.number().optional().describe("New priority (0-65535, for MX/SRV)"),
    new_weight: z.number().optional().describe("New weight (0-65535, for SRV)"),
    new_port: z.number().optional().describe("New port (1-65535, for SRV)"),
  },
}, async ({ domain_id, old_name, old_type, old_content, old_ttl, new_name, new_type, new_content, new_ttl, new_priority, new_weight, new_port }) => {
  const old = { name: old_name, type: old_type, content: old_content };
  if (old_ttl !== undefined) old.ttl = old_ttl;
  const nw = { name: new_name, type: new_type, content: new_content, ttl: new_ttl };
  if (new_priority !== undefined) nw.priority = new_priority;
  if (new_weight !== undefined) nw.weight = new_weight;
  if (new_port !== undefined) nw.port = new_port;
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
}, async ({ domain_id, name, type, content }) => {
  return result(await v2("DELETE", `/domains/${domain_id}/zone-records`, { name, type, content }));
});

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
    events: z.array(z.string()).describe("Events to subscribe to: sent, delivered, bounced, failed, unsubscribed"),
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
    timeout_seconds: z.number().optional().describe("Request timeout 5-30s"),
  },
}, async ({ webhook_id, ...updates }) => {
  const body = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) body[k] = v;
  }
  return result(await v2("PATCH", `/webhooks/${webhook_id}`, body));
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

server.registerTool("list_webhook_delivery_logs", {
  description: "List delivery logs for a webhook endpoint",
  inputSchema: {
    webhook_id: z.number().describe("Webhook ID"),
    status: z.string().optional().describe("Filter: success, failure, or all"),
    date_from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    date_to: z.string().optional().describe("End date (YYYY-MM-DD)"),
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
    scopes: z.array(z.string()).describe("Scopes: email:send, email:read, webhooks:manage"),
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
    content_retention_days: z.number().describe("Days to retain email content (7-2555)"),
    event_specific_retention: z.record(z.number()).optional().describe("Per-event retention overrides (event_name → days)"),
  },
}, async ({ metadata_retention_days, content_retention_days, event_specific_retention }) => {
  const body = { metadata_retention_days, content_retention_days };
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
