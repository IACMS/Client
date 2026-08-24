import { describe, it, expect } from 'vitest';
import { permissionAllowed } from '../roles';

describe('permissionAllowed', () => {
  it('returns true when exact permission is granted', () => {
    expect(permissionAllowed(['cases:read', 'cases:create'], 'cases:read')).toBe(true);
  });

  it('returns false when exact permission is missing', () => {
    expect(permissionAllowed(['cases:read'], 'cases:delete')).toBe(false);
  });

  it('returns true for global wildcard *', () => {
    expect(permissionAllowed(['*'], 'cases:delete')).toBe(true);
  });

  it('returns true for global admin wildcard admin:*', () => {
    expect(permissionAllowed(['admin:*'], 'users:delete')).toBe(true);
  });

  it('returns true for resource wildcard such as cases:*', () => {
    expect(permissionAllowed(['cases:*'], 'cases:delete')).toBe(true);
    expect(permissionAllowed(['cases:*'], 'users:delete')).toBe(false);
  });
});
