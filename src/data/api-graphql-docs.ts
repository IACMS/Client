export interface GqlOperation {
  id: string;
  type: "query" | "mutation";
  name: string;
  title: string;
  description: string;
  scope: string;
  query: string;
  variables: Record<string, any>;
  response: any;
}

export interface GqlSection {
  id: string;
  title: string;
  description?: string;
  operations: GqlOperation[];
}

export const graphqlDocs: GqlSection[] = [
  {
    id: "gql-queries",
    title: "GraphQL Queries",
    description: "Read data from the IACMS platform using GraphQL queries. All queries are sent as POST requests to /api/v1/graphql with your API key in the X-API-Key header.",
    operations: [
      {
        id: "gql-cases",
        type: "query",
        name: "cases",
        title: "Query cases",
        description: "Retrieve a paginated list of cases with optional filtering by status, priority, date range, and assignment. Supports sorting by any field.",
        scope: "cases:read",
        query: `query GetCases($filter: CaseFilter, $sort: CaseSort, $pagination: Pagination) {
  cases(filter: $filter, sort: $sort, pagination: $pagination) {
    data {
      id
      caseNumber
      title
      status
      priority
      type
      dueDate
      createdAt
      assignee { firstName lastName email }
      currentStep { name key isFinal }
      workflow { name key version }
      originatingDepartment { name code }
    }
    pagination { total limit offset hasMore }
    meta { executionTimeMs requestId }
  }
}`,
        variables: {
          filter: { status: "open", priority: "high" },
          sort: { field: "createdAt", order: "DESC" },
          pagination: { limit: 20, offset: 0 },
        },
        response: {
          data: {
            cases: {
              data: [
                {
                  id: "case_01J8A",
                  caseNumber: "CAS-2026-0001",
                  title: "Family assessment for Doe household",
                  status: "open",
                  priority: "high",
                  type: "assessment",
                  dueDate: "2026-10-01T00:00:00Z",
                  createdAt: "2026-09-24T08:00:00Z",
                  assignee: { firstName: "Jane", lastName: "Smith", email: "case.manager1@dcs-01.gov.example" },
                  currentStep: { name: "Initial Review", key: "initial_review", isFinal: false },
                  workflow: { name: "Standard Case", key: "standard-case", version: 1 },
                  originatingDepartment: { name: "Child Protection Intake Desk", code: "CP-INTAKE" },
                },
              ],
              pagination: { total: 42, limit: 20, offset: 0, hasMore: true },
              meta: { executionTimeMs: 23, requestId: "req_abc123" },
            },
          },
        },
      },
      {
        id: "gql-workflows",
        type: "query",
        name: "workflows",
        title: "Query workflows",
        description: "Retrieve workflow templates with their steps and transitions. Useful for understanding the available process flows before creating cases.",
        scope: "workflows:read",
        query: `query GetWorkflows($filter: WorkflowFilter, $pagination: Pagination) {
  workflows(filter: $filter, pagination: $pagination) {
    data {
      id
      name
      key
      version
      status
      steps { name key position }
    }
    pagination { total limit offset hasMore }
  }
}`,
        variables: {
          filter: { status: "PUBLISHED" },
          pagination: { limit: 10, offset: 0 },
        },
        response: {
          data: {
            workflows: {
              data: [
                {
                  id: "wf_9381",
                  name: "Standard Case",
                  key: "standard-case",
                  version: 1,
                  status: "PUBLISHED",
                  steps: [
                    { name: "Intake", key: "intake", position: 0 },
                    { name: "Initial Review", key: "initial_review", position: 1 },
                    { name: "Investigation", key: "investigation", position: 2 },
                    { name: "Resolution", key: "resolution", position: 3 },
                  ],
                },
              ],
              pagination: { total: 5, limit: 10, offset: 0, hasMore: false },
            },
          },
        },
      },
      {
        id: "gql-referrals",
        type: "query",
        name: "referrals",
        title: "Query referrals",
        description: "Retrieve cross-agency referrals. Referrals represent cases or requests forwarded between different tenants or departments.",
        scope: "referrals:read",
        query: `query GetReferrals($filter: ReferralFilter, $pagination: Pagination) {
  referrals(filter: $filter, pagination: $pagination) {
    data {
      id
      status
      caseId
      fromTenantId
      toTenantId
      reason
      createdAt
    }
    pagination { total limit offset hasMore }
  }
}`,
        variables: { pagination: { limit: 10, offset: 0 } },
        response: {
          data: {
            referrals: {
              data: [
                { id: "ref_001", status: "pending", caseId: "case_01J8A", fromTenantId: "tenant_dcs01", toTenantId: "tenant_court", reason: "Court hearing required", createdAt: "2026-09-23T14:00:00Z" },
              ],
              pagination: { total: 3, limit: 10, offset: 0, hasMore: false },
            },
          },
        },
      },
      {
        id: "gql-audit-logs",
        type: "query",
        name: "auditLogs",
        title: "Query audit logs",
        description: "Retrieve the immutable audit trail. Every action in the system is recorded with the actor, action type, affected entity, and timestamp.",
        scope: "auditLogs:read",
        query: `query GetAuditLogs($filter: AuditLogFilter, $pagination: Pagination) {
  auditLogs(filter: $filter, pagination: $pagination) {
    data {
      id
      action
      entityType
      entityId
      userId
      metadata
      createdAt
    }
    pagination { total limit offset hasMore }
  }
}`,
        variables: {
          filter: { entityType: "case" },
          pagination: { limit: 5, offset: 0 },
        },
        response: {
          data: {
            auditLogs: {
              data: [
                { id: "log_991", action: "case.transition.executed", entityType: "case", entityId: "case_01J8A", userId: "usr_12345", metadata: { fromStep: "intake", toStep: "initial_review" }, createdAt: "2026-09-24T08:30:00Z" },
              ],
              pagination: { total: 128, limit: 5, offset: 0, hasMore: true },
            },
          },
        },
      },
      {
        id: "gql-metrics",
        type: "query",
        name: "metrics",
        title: "Query metrics",
        description: "Retrieve aggregate metrics for your tenant including total cases, open/closed counts, average resolution time, and overdue count. Use the select argument to choose which metrics to compute.",
        scope: "metrics:read",
        query: `query GetMetrics($select: [MetricField!]) {
  metrics(select: $select) {
    totalCases
    openCases
    closedCases
    avgResolutionDays
    overdueCount
    meta { executionTimeMs requestId }
  }
}`,
        variables: {
          select: ["totalCases", "openCases", "closedCases", "avgResolutionDays", "overdueCount"],
        },
        response: {
          data: {
            metrics: { totalCases: 156, openCases: 42, closedCases: 114, avgResolutionDays: 12.4, overdueCount: 7, meta: { executionTimeMs: 45, requestId: "req_met001" } },
          },
        },
      },
    ],
  },
  {
    id: "gql-mutations",
    title: "GraphQL Mutations",
    description: "Modify data in the IACMS platform using GraphQL mutations. Mutations require appropriate write scopes on your API key.",
    operations: [
      {
        id: "gql-create-case",
        type: "mutation",
        name: "createCase",
        title: "Create a case",
        description: "Creates a new case and assigns it to a workflow. The case starts at the initial step of the specified workflow.",
        scope: "cases:create",
        query: `mutation CreateCase($input: CreateCaseInput!) {
  createCase(input: $input) {
    case {
      id
      caseNumber
      title
      status
      currentStep { name key }
      workflow { name key }
      createdAt
    }
    success
    message
  }
}`,
        variables: {
          input: {
            title: "New child welfare assessment",
            type: "assessment",
            priority: "high",
            description: "Referral received from school counselor regarding welfare concerns.",
            workflowKey: "standard-case",
          },
        },
        response: {
          data: {
            createCase: {
              case: { id: "case_NEW01", caseNumber: "CAS-2026-0157", title: "New child welfare assessment", status: "open", currentStep: { name: "Intake", key: "intake" }, workflow: { name: "Standard Case", key: "standard-case" }, createdAt: "2026-09-24T12:00:00Z" },
              success: true,
              message: "Case created successfully.",
            },
          },
        },
      },
      {
        id: "gql-execute-transition",
        type: "mutation",
        name: "executeTransition",
        title: "Execute a transition",
        description: "Progresses a case from its current workflow step to the next by executing a named transition. This is how cases move through their lifecycle.",
        scope: "cases:update",
        query: `mutation ExecuteTransition($input: ExecuteTransitionInput!) {
  executeTransition(input: $input) {
    case {
      id
      caseNumber
      status
      currentStep { name key isFinal }
    }
    previousStep { name key }
    success
    message
  }
}`,
        variables: {
          input: {
            caseId: "case_01J8A",
            transitionId: "tr_7721",
            comment: "Initial assessment completed. All documentation verified.",
          },
        },
        response: {
          data: {
            executeTransition: {
              case: { id: "case_01J8A", caseNumber: "CAS-2026-0001", status: "open", currentStep: { name: "Investigation", key: "investigation", isFinal: false } },
              previousStep: { name: "Initial Review", key: "initial_review" },
              success: true,
              message: "Transition executed successfully.",
            },
          },
        },
      },
      {
        id: "gql-close-case",
        type: "mutation",
        name: "closeCase",
        title: "Close a case",
        description: "Closes a case with a resolution reason. The case must be at a final workflow step, or this will return an error.",
        scope: "cases:update",
        query: `mutation CloseCase($input: CloseCaseInput!) {
  closeCase(input: $input) {
    case {
      id
      caseNumber
      status
      closedAt
    }
    success
    message
  }
}`,
        variables: {
          input: {
            caseId: "case_01J8A",
            resolution: "Case resolved — family support plan implemented successfully.",
          },
        },
        response: {
          data: {
            closeCase: {
              case: { id: "case_01J8A", caseNumber: "CAS-2026-0001", status: "closed", closedAt: "2026-09-24T16:00:00Z" },
              success: true,
              message: "Case closed successfully.",
            },
          },
        },
      },
      {
        id: "gql-create-referral",
        type: "mutation",
        name: "createReferral",
        title: "Create a referral",
        description: "Creates a cross-agency referral, forwarding a case to another tenant or department for action.",
        scope: "referrals:create",
        query: `mutation CreateReferral($input: CreateReferralInput!) {
  createReferral(input: $input) {
    referral {
      id
      status
      caseId
      toTenantId
      reason
      createdAt
    }
    success
    message
  }
}`,
        variables: {
          input: {
            caseId: "case_01J8A",
            toTenantId: "tenant_court",
            reason: "Court order required for custody evaluation.",
          },
        },
        response: {
          data: {
            createReferral: {
              referral: { id: "ref_NEW01", status: "pending", caseId: "case_01J8A", toTenantId: "tenant_court", reason: "Court order required for custody evaluation.", createdAt: "2026-09-24T12:30:00Z" },
              success: true,
              message: "Referral created successfully.",
            },
          },
        },
      },
      {
        id: "gql-invite-user",
        type: "mutation",
        name: "inviteUser",
        title: "Invite a user",
        description: "Invites a new user to the authenticated tenant. The user will receive an email invitation with a link to set up their account.",
        scope: "users:create",
        query: `mutation InviteUser($input: InviteUserInput!) {
  inviteUser(input: $input) {
    user {
      id
      email
      firstName
      lastName
    }
    success
    message
  }
}`,
        variables: {
          input: {
            email: "new.worker@dcs-01.gov.example",
            firstName: "John",
            lastName: "Doe",
            role: "case_manager",
          },
        },
        response: {
          data: {
            inviteUser: {
              user: { id: "usr_NEW01", email: "new.worker@dcs-01.gov.example", firstName: "John", lastName: "Doe" },
              success: true,
              message: "Invitation sent successfully.",
            },
          },
        },
      },
    ],
  },
];
