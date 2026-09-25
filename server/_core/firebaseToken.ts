import { createRemoteJWKSet, jwtVerify } from "jose";

const projectId = "matgar-hoda";
const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export type FirebaseIdentity = {
  uid: string;
  email: string;
  name?: string;
};

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<FirebaseIdentity> {
  const { payload } = await jwtVerify(idToken, jwks, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer,
  });

  const uid = typeof payload.sub === "string" ? payload.sub : "";
  const email =
    typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  const name = typeof payload.name === "string" ? payload.name : undefined;

  if (!uid || !email) {
    throw new Error("Firebase token is missing an email identity");
  }

  return { uid, email, name };
}
