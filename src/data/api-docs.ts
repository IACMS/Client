export type ApiLanguage = "curl" | "js" | "python";

export interface ApiParameter {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  parameters?: ApiParameter[];
  bodyParams?: ApiParameter[];
  snippets: Record<ApiLanguage, string>;
  response: any;
}

export interface ApiSection {
  id: string;
  title: string;
  description?: string;
  endpoints: ApiEndpoint[];
}

export const apiDocs: ApiSection[] = [
  {
    id: "authentication",
    title: "Authentication",
    description:
      "Authenticate your API requests using JWT Bearer tokens. All protected endpoints require a valid access token obtained through the login endpoint.",
    endpoints: [
      {
        id: "auth-login",
        method: "POST",
        path: "/api/v1/auth/login",
        title: "Create an access token",
        description:
          "Creates a new JWT access token and refresh token by authenticating with email, password, and tenant code. The access token should be included as a Bearer token in all subsequent API requests.",
        bodyParams: [
          { name: "email", type: "string", required: true, description: "The email address of the user." },
          { name: "password", type: "string", required: true, description: "The user's password." },
          { name: "tenantCode", type: "string", required: true, description: "The unique code identifying your agency/tenant (e.g., DCS-01)." },
        ],
        snippets: {
          curl: `curl -X POST http://localhost:3000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@dcs-01.gov.example",
    "password": "password123",
    "tenantCode": "DCS-01"
  }'`,
          js: `const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@dcs-01.gov.example',
    password: 'password123',
    tenantCode: 'DCS-01'
  })
});
const data = await response.json();`,
          python: `import requests

response = requests.post(
    "http://localhost:3000/api/v1/auth/login",
    json={
        "email": "admin@dcs-01.gov.example",
        "password": "password123",
        "tenantCode": "DCS-01"
    }
)
data = response.json()`,
        },
        response: {
          status: "success",
          data: {
            accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            refreshToken: "d2VibWFrZXIucmVmcmVzaC50b2tlbi...",
            user: { id: "usr_12345", email: "admin@dcs-01.gov.example", firstName: "Admin", lastName: "User" },
          },
        },
      },
      {
        id: "auth-register",
        method: "POST",
        path: "/api/v1/auth/register",
        title: "Register a user",
        description: "Creates a new user account within an existing tenant. The user will receive a verification email.",
        bodyParams: [
          { name: "email", type: "string", required: true, description: "Email address for the new account." },
          { name: "password", type: "string", required: true, description: "Password (min 8 chars, must include uppercase, lowercase, number)." },
          { name: "firstName", type: "string", required: true, description: "User's first name." },
          { name: "lastName", type: "string", required: true, description: "User's last name." },
          { name: "tenantCode", type: "string", required: true, description: "Tenant code to register under." },
        ],
        snippets: {
          curl: `curl -X POST http://localhost:3000/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "new.user@dcs-01.gov.example",
    "password": "SecureP@ss123",
    "firstName": "Jane",
    "lastName": "Doe",
    "tenantCode": "DCS-01"
  }'`,
          js: `const response = await fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'new.user@dcs-01.gov.example',
    password: 'SecureP@ss123',
    firstName: 'Jane',
    lastName: 'Doe',
    tenantCode: 'DCS-01'
  })
});
const data = await response.json();`,
          python: `import requests

response = requests.post(
    "http://localhost:3000/api/v1/auth/register",
    json={
        "email": "new.user@dcs-01.gov.example",
        "password": "SecureP@ss123",
        "firstName": "Jane",
        "lastName": "Doe",
        "tenantCode": "DCS-01"
    }
)
data = response.json()`,
        },
        response: {
          status: "success",
          data: { id: "usr_67890", email: "new.user@dcs-01.gov.example", message: "Verification email sent." },
        },
      },
      {
        id: "auth-refresh",
        method: "POST",
        path: "/api/v1/auth/refresh",
        title: "Refresh an access token",
        description: "Exchanges a valid refresh token for a new access token. Use this when your access token expires to avoid re-authenticating.",
        bodyParams: [
          { name: "refreshToken", type: "string", required: true, description: "The refresh token received from the login endpoint." },
        ],
        snippets: {
          curl: `curl -X POST http://localhost:3000/api/v1/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{ "refreshToken": "d2VibWFrZXIucmVmcmVzaC50b2tlbi..." }'`,
          js: `const response = await fetch('http://localhost:3000/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: 'd2VibWFrZXIucmVmcmVzaC50b2tlbi...' })
});
const data = await response.json();`,
          python: `import requests

response = requests.post(
    "http://localhost:3000/api/v1/auth/refresh",
    json={"refreshToken": "d2VibWFrZXIucmVmcmVzaC50b2tlbi..."}
)
data = response.json()`,
        },
        response: {
          status: "success",
          data: { accessToken: "eyJhbGciOiJIUzI1NiJ9.newtoken...", expiresIn: 3600 },
        },
      },
    ],
  },
  {
    id: "api-keys",
    title: "API Keys",
    description:
      "API keys grant programmatic access to the GraphQL Partner API. Each key is scoped to specific permissions and tied to a tenant. Manage your keys via these REST endpoints.",
    endpoints: [
      {
        id: "list-api-keys",
        method: "GET",
        path: "/api/v1/api-keys",
        title: "List API keys",
        description: "Returns all API keys belonging to the authenticated user's tenant. Keys are returned with their scopes and metadata, but the secret is only shown once at creation time.",
        parameters: [],
        snippets: {
          curl: `curl http://localhost:3000/api/v1/api-keys \\
  -H "Authorization: Bearer <access_token>"`,
          js: `const response = await fetch('http://localhost:3000/api/v1/api-keys', {
  headers: { 'Authorization': 'Bearer <access_token>' }
});
const data = await response.json();`,
          python: `import requests

response = requests.get(
    "http://localhost:3000/api/v1/api-keys",
    headers={"Authorization": "Bearer <access_token>"}
)
data = response.json()`,
        },
        response: {
          status: "success",
          data: [
            {
              id: "ak_001",
              name: "Production Integration",
              prefix: "iacms_live_xK7...",
              scopes: ["cases:read", "cases:create", "workflows:read"],
              createdAt: "2026-09-20T10:00:00Z",
              lastUsedAt: "2026-09-24T08:15:00Z",
            },
          ],
        },
      },
      {
        id: "create-api-key",
        method: "POST",
        path: "/api/v1/api-keys",
        title: "Create an API key",
        description:
          "Creates a new API key with specific scopes. The full key secret is returned only in this response — store it securely. Available scopes: cases:read, cases:create, cases:update, workflows:read, workflowSteps:read, referrals:read, referrals:create, assignments:read, auditLogs:read, departments:read, metrics:read, users:create, users:update, users:deactivate.",
        bodyParams: [
          { name: "name", type: "string", required: true, description: "A human-readable name for the key." },
          { name: "scopes", type: "string[]", required: true, description: "Array of permission scopes to grant." },
          { name: "expiresAt", type: "string", required: false, description: "ISO 8601 expiration date. Omit for non-expiring keys." },
        ],
        snippets: {
          curl: `curl -X POST http://localhost:3000/api/v1/api-keys \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Integration",
    "scopes": ["cases:read", "cases:create", "workflows:read", "metrics:read"]
  }'`,
          js: `const response = await fetch('http://localhost:3000/api/v1/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <access_token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Production Integration',
    scopes: ['cases:read', 'cases:create', 'workflows:read', 'metrics:read']
  })
});
const data = await response.json();
// IMPORTANT: Save data.data.key — it won't be shown again!`,
          python: `import requests

response = requests.post(
    "http://localhost:3000/api/v1/api-keys",
    headers={"Authorization": "Bearer <access_token>"},
    json={
        "name": "Production Integration",
        "scopes": ["cases:read", "cases:create", "workflows:read", "metrics:read"]
    }
)
data = response.json()
# IMPORTANT: Save data["data"]["key"] — it won't be shown again!`,
        },
        response: {
          status: "success",
          data: {
            id: "ak_002",
            name: "Production Integration",
            key: "iacms_live_xK7mN9pQ2rS4tU6vW8xY0zA...",
            scopes: ["cases:read", "cases:create", "workflows:read", "metrics:read"],
            createdAt: "2026-09-24T12:00:00Z",
          },
          warning: "Store the key securely. It will not be displayed again.",
        },
      },
      {
        id: "revoke-api-key",
        method: "DELETE",
        path: "/api/v1/api-keys/:id",
        title: "Revoke an API key",
        description: "Permanently revokes an API key. All requests using this key will immediately start returning 401 Unauthorized.",
        parameters: [
          { name: "id", type: "string", required: true, description: "The ID of the API key to revoke." },
        ],
        snippets: {
          curl: `curl -X DELETE http://localhost:3000/api/v1/api-keys/ak_002 \\
  -H "Authorization: Bearer <access_token>"`,
          js: `const response = await fetch('http://localhost:3000/api/v1/api-keys/ak_002', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer <access_token>' }
});
const data = await response.json();`,
          python: `import requests

response = requests.delete(
    "http://localhost:3000/api/v1/api-keys/ak_002",
    headers={"Authorization": "Bearer <access_token>"}
)
data = response.json()`,
        },
        response: { status: "success", message: "API key revoked successfully." },
      },
    ],
  },
  {
    id: "webhooks-api",
    title: "Webhooks Management",
    description: "Register webhook endpoints to receive real-time event notifications from the IACMS platform.",
    endpoints: [
      {
        id: "list-webhooks",
        method: "GET",
        path: "/api/v1/webhooks",
        title: "List webhooks",
        description: "Returns all registered webhook endpoints for the authenticated tenant.",
        snippets: {
          curl: `curl http://localhost:3000/api/v1/webhooks \\
  -H "Authorization: Bearer <access_token>"`,
          js: `const response = await fetch('http://localhost:3000/api/v1/webhooks', {
  headers: { 'Authorization': 'Bearer <access_token>' }
});
const data = await response.json();`,
          python: `import requests

response = requests.get(
    "http://localhost:3000/api/v1/webhooks",
    headers={"Authorization": "Bearer <access_token>"}
)
data = response.json()`,
        },
        response: {
          status: "success",
          data: [
            { id: "wh_001", url: "https://example.com/webhooks/iacms", events: ["case.created", "case.updated"], active: true, createdAt: "2026-09-20T10:00:00Z" },
          ],
        },
      },
      {
        id: "create-webhook",
        method: "POST",
        path: "/api/v1/webhooks",
        title: "Create a webhook",
        description: "Registers a new webhook endpoint. IACMS will send HTTP POST requests to this URL whenever the specified events occur.",
        bodyParams: [
          { name: "url", type: "string", required: true, description: "The HTTPS URL to deliver webhook payloads to." },
          { name: "events", type: "string[]", required: true, description: "Array of event types to subscribe to." },
          { name: "secret", type: "string", required: false, description: "A shared secret for signing payloads (HMAC-SHA256)." },
        ],
        snippets: {
          curl: `curl -X POST http://localhost:3000/api/v1/webhooks \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/webhooks/iacms",
    "events": ["case.created", "case.updated", "referral.created"],
    "secret": "whsec_your_signing_secret"
  }'`,
          js: `const response = await fetch('http://localhost:3000/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <access_token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/webhooks/iacms',
    events: ['case.created', 'case.updated', 'referral.created'],
    secret: 'whsec_your_signing_secret'
  })
});
const data = await response.json();`,
          python: `import requests

response = requests.post(
    "http://localhost:3000/api/v1/webhooks",
    headers={"Authorization": "Bearer <access_token>"},
    json={
        "url": "https://example.com/webhooks/iacms",
        "events": ["case.created", "case.updated", "referral.created"],
        "secret": "whsec_your_signing_secret"
    }
)
data = response.json()`,
        },
        response: {
          status: "success",
          data: { id: "wh_002", url: "https://example.com/webhooks/iacms", events: ["case.created", "case.updated", "referral.created"], active: true, createdAt: "2026-09-24T12:00:00Z" },
        },
      },
      {
        id: "test-webhook",
        method: "POST",
        path: "/api/v1/webhooks/:id/test",
        title: "Test a webhook",
        description: "Sends a test payload to the webhook URL. Use this to verify your endpoint is correctly receiving and processing events.",
        parameters: [
          { name: "id", type: "string", required: true, description: "The webhook ID to test." },
        ],
        snippets: {
          curl: `curl -X POST http://localhost:3000/api/v1/webhooks/wh_002/test \\
  -H "Authorization: Bearer <access_token>"`,
          js: `const response = await fetch('http://localhost:3000/api/v1/webhooks/wh_002/test', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <access_token>' }
});
const data = await response.json();`,
          python: `import requests

response = requests.post(
    "http://localhost:3000/api/v1/webhooks/wh_002/test",
    headers={"Authorization": "Bearer <access_token>"}
)
data = response.json()`,
        },
        response: {
          status: "success",
          data: { delivered: true, statusCode: 200, responseTimeMs: 142 },
        },
      },
    ],
  },
];
