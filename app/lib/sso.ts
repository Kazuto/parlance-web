/** The page single sign-on providers send the browser back to, as registered with them. */
export function ssoRedirectUri() {
  return `${window.location.origin}/sso/callback`;
}
