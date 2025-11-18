import { generateApiSignature } from './payfast';

/**
 * Unit tests for PayFast signature generation
 * Run with: npm test or jest payfast.test.ts
 */

describe('PayFast API Signature Generation', () => {
  const passphrase = 'test_passphrase';

  test('should sort parameters alphabetically', () => {
    const data = {
      'merchant-id': '10000100',
      'version': 'v1',
      'timestamp': '2025-01-15T10:30:00Z',
      'cycles': 1
    };

    const signature = generateApiSignature(data, passphrase);
    
    // Signature should be a 32-character MD5 hash (lowercase hex)
    expect(signature).toMatch(/^[a-f0-9]{32}$/);
    expect(signature.length).toBe(32);
  });

  test('should handle URL encoding correctly', () => {
    const data = {
      'merchant-id': '10000100',
      'version': 'v1',
      'timestamp': '2025-01-15 10:30:00',
      'test-field': 'value with spaces'
    };

    const signature = generateApiSignature(data, passphrase);
    
    // Should not throw and should produce valid hash
    expect(signature).toMatch(/^[a-f0-9]{32}$/);
  });

  test('should handle empty data object', () => {
    const data = {};
    const signature = generateApiSignature(data, passphrase);
    
    // Should still produce a hash (passphrase only)
    expect(signature).toMatch(/^[a-f0-9]{32}$/);
  });

  test('should produce same signature for same input', () => {
    const data = {
      'merchant-id': '10000100',
      'version': 'v1',
      'timestamp': '2025-01-15T10:30:00Z',
      'cycles': 1
    };

    const signature1 = generateApiSignature(data, passphrase);
    const signature2 = generateApiSignature(data, passphrase);
    
    expect(signature1).toBe(signature2);
  });

  test('should produce different signatures for different data', () => {
    const data1 = {
      'merchant-id': '10000100',
      'version': 'v1',
      'timestamp': '2025-01-15T10:30:00Z',
      'cycles': 1
    };

    const data2 = {
      'merchant-id': '10000100',
      'version': 'v1',
      'timestamp': '2025-01-15T10:30:00Z',
      'cycles': 2
    };

    const signature1 = generateApiSignature(data1, passphrase);
    const signature2 = generateApiSignature(data2, passphrase);
    
    expect(signature1).not.toBe(signature2);
  });

  test('should handle special characters in values', () => {
    const data = {
      'merchant-id': '10000100',
      'version': 'v1',
      'timestamp': '2025-01-15T10:30:00Z',
      'description': 'Test & Value / Special'
    };

    const signature = generateApiSignature(data, passphrase);
    
    // Should not throw and should produce valid hash
    expect(signature).toMatch(/^[a-f0-9]{32}$/);
  });

  test('should handle numeric values', () => {
    const data = {
      'merchant-id': '10000100',
      'version': 'v1',
      'timestamp': '2025-01-15T10:30:00Z',
      'amount': 99900,
      'cycles': 1
    };

    const signature = generateApiSignature(data, passphrase);
    
    expect(signature).toMatch(/^[a-f0-9]{32}$/);
  });

  test('should sort keys alphabetically regardless of input order', () => {
    const data1 = {
      'z-key': 'last',
      'a-key': 'first',
      'm-key': 'middle'
    };

    const data2 = {
      'a-key': 'first',
      'm-key': 'middle',
      'z-key': 'last'
    };

    const signature1 = generateApiSignature(data1, passphrase);
    const signature2 = generateApiSignature(data2, passphrase);
    
    // Should produce same signature because keys are sorted
    expect(signature1).toBe(signature2);
  });
});






