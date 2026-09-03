
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TenantRolesPage from '../TenantRolesPage';
import { apiGet } from '@/lib/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    user: { id: 'u-1', tenantId: 'tenant-123' },
    refetchSession: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

describe('TenantRolesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches and renders roles and users list', async () => {
    vi.mocked(apiGet).mockImplementation((url: string) => {
      if (url.includes('/auth/roles')) {
        return Promise.resolve({
          roles: [
            {
              id: 'r-1',
              name: 'tenant_admin',
              description: 'Tenant Administrator',
              isSystemRole: true,
              tenantId: null,
              rolePermissions: [{ permission: { id: 'p-1', resource: 'cases', action: 'create', description: null } }],
            },
          ],
        });
      }
      if (url.includes('/auth/permissions')) {
        return Promise.resolve({
          permissions: [{ id: 'p-1', resource: 'cases', action: 'create', description: 'Create cases' }],
        });
      }
      if (url.includes('/auth/users')) {
        return Promise.resolve({
          users: [
            { id: 'u-1', firstName: 'Sara', lastName: 'Tadesse', email: 'sara@iacms.org', role: { id: 'r-1', name: 'tenant_admin' } },
          ],
        });
      }
      return Promise.resolve({});
    });

    render(<TenantRolesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Roles & Permissions Management/i)).toBeInTheDocument();
      expect(screen.getAllByText(/tenant admin/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Sara Tadesse/i)).toBeInTheDocument();
    });
  });

  it('opens Create Role modal when button is clicked', async () => {
    vi.mocked(apiGet).mockResolvedValue({ roles: [], permissions: [], users: [] });

    render(<TenantRolesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Create Tenant Role/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Create Tenant Role/i));
    expect(screen.getByText(/Create Custom Tenant Role/i)).toBeInTheDocument();
  });
});
