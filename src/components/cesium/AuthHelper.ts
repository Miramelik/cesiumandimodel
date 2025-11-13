import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import { ITwinPlatform } from "cesium";

export const setupAuthentication = async (): Promise<string | null> => {
  const clientId = process.env.REACT_APP_CLIENT_ID!;
  const redirectUri = window.location.origin;

  const authClient = new BrowserAuthorizationClient({
    authority: "https://ims.bentley.com",
    clientId,
    scope: "itwin-platform",
    redirectUri,
    responseType: "code",
  });

  try {
    await authClient.signInSilent();
  } catch {
    await authClient.signInRedirect();
    return null;
  }

  await authClient.handleSigninCallback();
  const accessToken = await authClient.getAccessToken();
  ITwinPlatform.defaultAccessToken = accessToken.replace("Bearer ", "");
  return accessToken;
};
