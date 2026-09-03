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

const AuthContext = createContext(null);

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
      const attributes = cognitoUser?.getSignInUserSession()
        ?.getIdToken()
        ?.payload || {};

      setUser({
        username: cognitoUser?.getUsername(),
        email: attributes.email,
        name: attributes.name,
        role: attributes["custom:role"] || "CUSTOMER"
      });

      try {
        setProfile(await api.getProfile());
      } catch {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email, password) {
    await signIn(email, password);
    await refresh();
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