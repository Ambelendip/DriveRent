import { createContext, useContext, useEffect, useState } from "react";
import {
  getUser,
  getSession,
  signIn,
  signUp,
  confirmSignUp,
  signOut
} from "../services/auth";
import { api } from "../services/api";

const authContextKey = Symbol.for("driverent.auth-context");
const AuthContext = globalThis[authContextKey] || createContext(null);
globalThis[authContextKey] = AuthContext;

function roleFromClaims(attributes) {
  // Cognito groups are the most reliable signal for admin access.
  const groups = Array.isArray(attributes["cognito:groups"])
    ? attributes["cognito:groups"]
    : typeof attributes["cognito:groups"] === "string"
      ? attributes["cognito:groups"].split(",")
      : [];
  if (groups.some((g) => String(g).trim().toLowerCase().includes("admin"))) {
    return "ADMIN";
  }
  // Fallback: custom:role attribute (e.g. set by scripts/create_admin.py)
  const customRole = String(attributes["custom:role"] || "").trim().toUpperCase();
  if (customRole === "ADMIN") return "ADMIN";
  return "CUSTOMER";
}

async function resolveRole(attributes) {
  const claimRole = roleFromClaims(attributes);
  if (claimRole === "ADMIN") return claimRole;

  try {
    await api.getAdminStats();
    return "ADMIN";
  } catch {
    return claimRole;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const session = await getSession();
      if (!session) {
        setUser(null);
        setProfile(null);
        return;
      }

      const cognitoUser = getUser();
      const idToken = cognitoUser?.getSignInUserSession()?.getIdToken()?.payload || {};
      // cognito:groups is only present in the ACCESS token, not the ID token.
      const accessToken = cognitoUser?.getSignInUserSession()?.getAccessToken()?.payload || {};
      const attributes = { ...idToken, ...accessToken };

      const email = idToken.email || cognitoUser?.getUsername() || "";

      const role = await resolveRole(attributes);
      setUser({
        username: cognitoUser?.getUsername(),
        email,
        name: idToken.name,
        role
      });

      try {
        setProfile(await api.getProfile());
      } catch {
        setProfile(null);
      }
      return role;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email, password) {
    await signIn(email, password);
    const session = await getSession();
    const idClaims = session?.getIdToken()?.payload || {};
    const accessClaims = session?.getAccessToken()?.payload || {};
    const claims = { ...idClaims, ...accessClaims };
    const role = await refresh();
    return {
      role: role || roleFromClaims(claims),
      email: idClaims.email || email
    };
  }

  async function register(data) {
    return signUp(data);
  }

  async function confirm(email, code) {
    return confirmSignUp(email, code);
  }

  function logout() {
    signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        confirm,
        logout,
        refresh
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
