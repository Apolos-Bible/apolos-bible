const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

/**
 * Only public HTTP(S) pages may become iframe nodes. Besides javascript:/data:
 * this blocks local and private network targets, so a shared board cannot be
 * used to probe services running on another participant's machine or LAN.
 */
export function safeExternalUrl(input: string): string | null {
  const value = input.trim();
  if (!value || value.length > 2048) return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    PRIVATE_IPV4.some((pattern) => pattern.test(host)) ||
    host === '::' ||
    host === '::1' ||
    host.startsWith('::ffff:') ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe8') ||
    host.startsWith('fe9') ||
    host.startsWith('fea') ||
    host.startsWith('feb')
  ) {
    return null;
  }

  return url.toString();
}
