import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface WebhookRecord {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookPayload {
  name: string;
  url: string;
  events: string[];
}

export interface CreateWebhookResult {
  webhook: WebhookRecord;
  secret: string;
  warning: string;
}

export interface UpdateWebhookPayload {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
}

export async function fetchAvailableEvents(): Promise<string[]> {
  const data = (await apiGet("/api/v1/webhooks/events")) as { events: string[] };
  return data.events ?? [];
}

export async function listWebhooks(): Promise<WebhookRecord[]> {
  const data = (await apiGet("/api/v1/webhooks")) as { webhooks: WebhookRecord[] };
  return data.webhooks ?? [];
}

export async function createWebhook(payload: CreateWebhookPayload): Promise<CreateWebhookResult> {
  return (await apiPost("/api/v1/webhooks", payload)) as CreateWebhookResult;
}

export async function updateWebhook(id: string, payload: UpdateWebhookPayload): Promise<WebhookRecord> {
  const data = (await apiPatch(`/api/v1/webhooks/${id}`, payload)) as { webhook: WebhookRecord };
  return data.webhook;
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiDelete(`/api/v1/webhooks/${id}`);
}
