import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails
} from "amazon-cognito-identity-js";
import { config } from "../config";

const pool = new CognitoUserPool({
  UserPoolId: config.userPoolId,
  ClientId: config.clientId
});

export function getUser() {
  return pool.getCurrentUser();
}

export function getSession() {
  return new Promise((resolve, reject) => {
    const user = getUser();
    if (!user) return resolve(null);

    user.getSession((err, session) => {
      if (err) return reject(err);
      resolve(session && session.isValid() ? session : null);
    });
  });
}

export async function getIdToken() {
  const session = await getSession();
  return session?.getIdToken().getJwtToken() || null;
}

export function signIn(email, password) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    const details = new AuthenticationDetails({
      Username: email,
      Password: password
    });

    user.authenticateUser(details, {
      onSuccess: resolve,
      onFailure: reject,
      newPasswordRequired: () =>
        reject(new Error("A new password is required for this account."))
    });
  });
}

export function signUp({ email, password, name, phone }) {
  return new Promise((resolve, reject) => {
    const attributes = [
      { Name: "name", Value: name },
      ...(phone ? [{ Name: "phone_number", Value: phone }] : [])
    ];

    pool.signUp(email, password, attributes, [], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export function confirmSignUp(email, code) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.confirmRegistration(code, true, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export function resendConfirmation(email) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.resendConfirmationCode((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export function signOut() {
  const user = getUser();
  user?.signOut();
}

export function changePassword(currentPassword, newPassword) {
  return new Promise((resolve, reject) => {
    const user = getUser();
    if (!user) return reject(new Error("Not signed in"));
    user.getSession((err) => {
      if (err) return reject(err);
      user.changePassword(currentPassword, newPassword, (changeErr, result) => {
        if (changeErr) reject(changeErr);
        else resolve(result);
      });
    });
  });
}