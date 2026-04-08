import { dbRun, dbGet, dbAll } from './database';

const RP_ID = 'uniact.local';
const RP_NAME = 'UniAct';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

async function loadWebAuthnServer() {
  return await import('@simplewebauthn/server');
}

export async function getRegistrationOptions(userId: number, userName: string) {
  const { generateRegistrationOptions } = await loadWebAuthnServer();
  return await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(String(userId)),
    userName,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required',
    },
    timeout: 60000,
  });
}

export async function verifyRegistration(userId: number, response: any, expectedChallenge: string) {
  const { verifyRegistrationResponse } = await loadWebAuthnServer();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });
  if (!verification.verified || !verification.registrationInfo) return null;
  const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
  await dbRun(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports, device_name) VALUES (?,?,?,?,?,?)`,
    [
      userId,
      Buffer.from(credentialID).toString('base64url'),
      Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      JSON.stringify(response.response.transports || []),
      response.response.clientDataJSON ? undefined : null,
    ]
  );
  return true;
}

export async function getAuthenticationOptions(userId: number) {
  const { generateAuthenticationOptions } = await loadWebAuthnServer();
  const rows = await dbAll(
    'SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ?',
    [userId]
  );
  return await generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60000,
    allowCredentials: rows.map((r: any) => ({
      id: r.credential_id,
      type: 'public-key' as const,
      transports: JSON.parse(r.transports || '[]'),
    })),
    userVerification: 'required',
  });
}

export async function verifyAuthentication(
  userId: number,
  response: any,
  expectedChallenge: string
) {
  const { verifyAuthenticationResponse } = await loadWebAuthnServer();
  const credentialId = response.id;
  const credential = await dbGet('SELECT * FROM webauthn_credentials WHERE credential_id = ?', [
    credentialId,
  ]);
  if (!credential) return null;
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: credential.credential_id,
      credentialPublicKey: Buffer.from(credential.public_key, 'base64'),
      counter: credential.counter,
    },
  });
  if (!verification.verified) return null;
  await dbRun(
    'UPDATE webauthn_credentials SET counter = ?, last_used = CURRENT_TIMESTAMP WHERE credential_id = ?',
    [verification.authenticationInfo.newCounter, credentialId]
  );
  return true;
}
