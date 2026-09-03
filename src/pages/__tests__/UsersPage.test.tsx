
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UsersPage from '../UsersPage';
import { apiGet } from '@/lib/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    user: { id: 'u-1', email: 'admin@iacms.org', tenantId: 'tenant-123' },
    refetchSession: vi.fn(),
  }),
}));

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    can: (_perm: string) => true,
  }),
}));

vi.mock('@/lib/api', () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('UsersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders user list after successful fetch', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({
      users: [
        {
          id: 'u-1',
          email: 'user1@iacms.org',
          firstName: 'Abebe',
          lastName: 'Bikila',
          isActive: true,
          lastLogin: null,
          createdAt: '2026-08-01',
          role: { id: 'r-1', name: 'tenant_admin' },
        },
      ],
    });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Abebe Bikila')).toBeInTheDocument();
      expect(screen.getByText('user1@iacms.org')).toBeInTheDocument();
    });
  });

  it('renders error state if API fails', async () => {
    vi.mocked(apiGet).mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('users.loadFailed')).toBeInTheDocument();
    });
  });
});
