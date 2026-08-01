const AUTH_RETURN_PATH_KEY = 'apolos_auth_return_path'

function isInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//')
}

export function rememberAuthReturnPath(path = `${window.location.pathname}${window.location.search}${window.location.hash}`): void {
  if (isInternalPath(path)) sessionStorage.setItem(AUTH_RETURN_PATH_KEY, path)
}

export function consumeAuthReturnPath(fallback = '/'): string {
  const path = sessionStorage.getItem(AUTH_RETURN_PATH_KEY)
  sessionStorage.removeItem(AUTH_RETURN_PATH_KEY)
  return path && isInternalPath(path) ? path : fallback
}
