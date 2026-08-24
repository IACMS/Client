import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireAuth from '../RequireAuth';
import { useSession } from '@/context/SessionContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: vi.fn(),
}));

describe('RequireAuth component', () => {
  it('renders loading state when session status is loading', () => {
    vi.mocked(useSession).mockReturnValue({ user: null, status: 'loading', refetchSession: vi.fn() } as any);

    render(
      <MemoryRouter defaultEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<RequireAuth />}>
            <Route path="dashboard" element={<div>Dashboard Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('auth.checkingSession')).toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    vi.mocked(useSession).mockReturnValue({ user: null, status: 'unauthenticated', refetchSession: vi.fn() } as any);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<RequireAuth />}>
            <Route path="dashboard" element={<div>Dashboard Page</div>} />
          </Route>
          <Route path="login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('renders outlet when user is authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 'u-1', email: 'user@iacms.org', mustChangePassword: false },
      status: 'authenticated',
      refetchSession: vi.fn(),
    } as any);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<RequireAuth />}>
            <Route path="dashboard" element={<div>Dashboard Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
