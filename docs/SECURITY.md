# Pipeline One — Security Architecture & Guidelines

Pipeline One is architected with security as a foundational principle:

## 1. Cryptographic Token Vault
- **Algorithm**: AES-256-GCM authenticated encryption.
- **Key Derivation**: 256-bit hexadecimal key from `ENCRYPTION_KEY`.
- **IV & Tag**: 16-byte cryptographically random IV generated per encryption; 16-byte authentication tag verifies ciphertext integrity.
- **Payload format**: `iv_hex:auth_tag_hex:ciphertext_hex`.

## 2. Password Hashing
- **Algorithm**: Bcrypt with 12 salt rounds.
- Plaintext passwords are never logged or stored.

## 3. Session Security
- Signed JSON Web Tokens (JWT) signed with HMAC-SHA256.
- Set as `HttpOnly`, `SameSite=Lax`, and `Secure` in production environments.

## 4. Archive Upload Protection
- **Zip Slip Mitigation**: Validates that all target paths resolve strictly within the designated project sandbox directory (`resolvedPath.startsWith(destination + path.sep)`). Explicitly rejects directory traversal tokens (`..`, `/`, `\`).
- **Zip Bomb Mitigation**: Caps uncompressed decompression size at 150MB and limits entry count to 3,000 files.
- **No Script Execution**: Uploaded archives are inspected via static AST heuristics only. No arbitrary package scripts (`npm run`, `node`, `sh`) are executed during inspection.

## 5. Rate Limiting & Input Validation
- Global API rate limiting: 120 requests/minute.
- Authentication endpoints: 20 requests/15 minutes.
- File upload endpoints: 15 uploads/10 minutes.
- Strict schema validation enforced on all JSON requests via Zod.
