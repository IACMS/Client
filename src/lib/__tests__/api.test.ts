import { describe, it, expect } from 'vitest';
import {
  ApiError,
  isPasswordChangeRequiredError,
  isSchemaMismatchError,
  schemaMismatchHint,
  getApiBase,
} from '../api';

describe('api.ts helper utilities', () => {
  it('instantiates ApiError correctly', () => {
    const err = new ApiError(404, 'Not Found', { error: 'Resource missing' });
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not Found');
    expect(err.body).toEqual({ error: 'Resource missing' });
  });

  it('detects PASSWORD_CHANGE_REQUIRED error payload', () => {
    expect(isPasswordChangeRequiredError({ error: 'PASSWORD_CHANGE_REQUIRED' })).toBe(true);
    expect(isPasswordChangeRequiredError({ error: { code: 'PASSWORD_CHANGE_REQUIRED' } })).toBe(true);
    expect(isPasswordChangeRequiredError({ error: 'OTHER_ERROR' })).toBe(false);
    expect(isPasswordChangeRequiredError(null)).toBe(false);
  });

  it('detects SCHEMA_MISMATCH error payload', () => {
    expect(isSchemaMismatchError({ error: { code: 'SCHEMA_MISMATCH' } })).toBe(true);
    expect(isSchemaMismatchError({ error: { code: 'OTHER' } })).toBe(false);
    expect(isSchemaMismatchError(null)).toBe(false);
  });

  it('returns appropriate schema mismatch hint', () => {
    expect(schemaMismatchHint()).toContain('Database schema is out of date');
  });

  it('returns a valid string for getApiBase()', () => {
    expect(typeof getApiBase()).toBe('string');
  });
});
