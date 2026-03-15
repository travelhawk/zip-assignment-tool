import { randomBytes } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { createElectronSessionToken, type ElectronSessionUser } from "@/lib/electron-auth";

const ELECTRON_LOGIN_REQUEST_TTL_MS = 1000 * 60 * 5;

function cleanupExpiredLoginRequests(now = Date.now()) {
  getDatabase()
    .prepare("DELETE FROM electron_login_requests WHERE expires_at <= ?")
    .run(now);
}

export function createElectronLoginRequest() {
  cleanupExpiredLoginRequests();

  const requestId = randomBytes(32).toString("base64url");
  getDatabase()
    .prepare(`
      INSERT INTO electron_login_requests (request_id, session_token, expires_at)
      VALUES (?, NULL, ?)
    `)
    .run(requestId, Date.now() + ELECTRON_LOGIN_REQUEST_TTL_MS);

  return requestId;
}

export function completeElectronLoginRequest(
  requestId: string | null | undefined,
  user: Omit<ElectronSessionUser, "authMethod">,
  secret: string,
) {
  cleanupExpiredLoginRequests();

  if (!requestId) {
    return false;
  }

  const result = getDatabase()
    .prepare(`
      UPDATE electron_login_requests
      SET session_token = ?
      WHERE request_id = ? AND expires_at > ?
    `)
    .run(createElectronSessionToken(user, secret), requestId, Date.now());

  return (result.changes ?? 0) > 0;
}

export function getElectronLoginRequestStatus(requestId: string | null | undefined) {
  cleanupExpiredLoginRequests();

  if (!requestId) {
    return "expired" as const;
  }

  const record = getDatabase()
    .prepare(`
      SELECT session_token AS sessionToken
      FROM electron_login_requests
      WHERE request_id = ? AND expires_at > ?
    `)
    .get(requestId, Date.now()) as { sessionToken: string | null } | undefined;

  if (!record) {
    return "expired" as const;
  }

  return record.sessionToken ? ("complete" as const) : ("pending" as const);
}

export function consumeElectronLoginRequest(requestId: string | null | undefined) {
  cleanupExpiredLoginRequests();

  if (!requestId) {
    return null;
  }

  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");

  try {
    const record = db
      .prepare(`
        SELECT session_token AS sessionToken
        FROM electron_login_requests
        WHERE request_id = ? AND expires_at > ?
      `)
      .get(requestId, Date.now()) as { sessionToken: string | null } | undefined;

    if (!record?.sessionToken) {
      db.exec("ROLLBACK");
      return null;
    }

    db.prepare("DELETE FROM electron_login_requests WHERE request_id = ?").run(requestId);
    db.exec("COMMIT");
    return record.sessionToken;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
