import { hashPwd, checkPwd } from '../../utils/hash';

describe('hashPwd', () => {

  test('returns a hashed string not equal to plain password', async () => {
    const hash = await hashPwd('mypassword123');
    expect(hash).not.toBe('mypassword123');
  });

  test('returns a bcrypt hash starting with $2b$', async () => {
    const hash = await hashPwd('mypassword123');
    expect(hash).toMatch(/^\$2b\$/);
  });

  test('same password hashed twice gives different hashes', async () => {
    const hash1 = await hashPwd('mypassword123');
    const hash2 = await hashPwd('mypassword123');
    expect(hash1).not.toBe(hash2);
  });

});

describe('checkPwd', () => {

  test('returns true when plain password matches hash', async () => {
    const hash = await hashPwd('mypassword123');
    const result = await checkPwd('mypassword123', hash);
    expect(result).toBe(true);
  });

  test('returns false when wrong password', async () => {
    const hash = await hashPwd('mypassword123');
    const result = await checkPwd('wrongpassword', hash);
    expect(result).toBe(false);
  });

  test('returns false for empty string', async () => {
    const hash = await hashPwd('mypassword123');
    const result = await checkPwd('', hash);
    expect(result).toBe(false);
  });

});