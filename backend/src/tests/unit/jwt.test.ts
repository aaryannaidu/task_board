process.env.JWT_ACCESS_SECRET = 'test-access-secret-for-unit-tests-only-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests-only-32chars';

import { signAccessToken, signRefreshToken, verifyAccessToken } from '../../utils/jwt';

describe('signAccessToken', () => {

  test('returns a string token', () => {
    const token = signAccessToken(1, 'MEMBER');
    expect(typeof token).toBe('string');
  });

  test('token has three parts separated by dots', () => {
    const token = signAccessToken(1, 'MEMBER');
    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });

});

describe('signRefreshToken', () => {

  test('returns a string token', () => {
    const token = signRefreshToken(1);
    expect(typeof token).toBe('string');
  });

  test('token has three parts separated by dots', () => {
    const token = signRefreshToken(1);
    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });

});

describe('verifyAccessToken', () => {

  test('returns correct userID and globalRole from valid token', () => {
    const token = signAccessToken(5, 'ADMIN');
    const payload = verifyAccessToken(token);
    expect(payload.userID).toBe(5);
    expect(payload.globalRole).toBe('ADMIN');
  });

  test('throws error for invalid token', () => {
    expect(() => {
      verifyAccessToken('invalid.token.here');
    }).toThrow();
  });

  test('throws error for tampered token', () => {
    const token = signAccessToken(1, 'MEMBER');
    const tampered = token.slice(0, -5) + 'xxxxx';
    expect(() => {
      verifyAccessToken(tampered);
    }).toThrow();
  });

});