/**
 * SSRF (Server-Side Request Forgery) Protection for Webhooks
 * 
 * Prevents attackers from making requests to:
 * - localhost / loopback addresses
 * - Private IP ranges (RFC 1918)
 * - Cloud metadata endpoints
 * - Link-local addresses
 * - Multicast/reserved ranges
 */

// Lista de ranges de IP bloqueados
const BLOCKED_IP_RANGES = [
  // Localhost
  /^127\.\d+\.\d+\.\d+$/,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^localhost$/i,

  // Carrier-grade NAT (RFC 6598)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/,
  
  // Redes privadas RFC 1918
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  
  // Link-local
  /^169\.254\.\d+\.\d+$/,
  /^fe80:/i,

  // IPv6 ULA (fc00::/7)
  /^f[c-d][0-9a-f]{2}:/i,
  
  // Multicast
  /^224\.\d+\.\d+\.\d+$/,
  /^ff00:/i,
  
  // Reserved
  /^0\.\d+\.\d+\.\d+$/,
  /^240\.\d+\.\d+\.\d+$/,
  /^255\.255\.255\.255$/,
  // Benchmarking (RFC 2544)
  /^198\.(1[89])\.\d+\.\d+$/,
  // IETF protocol assignments
  /^192\.0\.0\.\d+$/,
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal', // GCP metadata
  '169.254.169.254', // AWS metadata
  '169.254.169.123', // DigitalOcean metadata
  'metadata.azure.com', // Azure metadata
  'metadata', // Generic metadata
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handle = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((v) => {
        clearTimeout(handle);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(handle);
        reject(e);
      });
  });
}

function isPossiblyIpLiteral(hostname: string): boolean {
  // URL.hostname já vem sem colchetes (ex.: https://[::1] -> "::1")
  const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
  const ipv6 = /^[0-9a-f:]+$/i.test(hostname) && hostname.includes(':');

  // Algumas representações "estranhas" (hex / octal / integer) devem ser tratadas como suspeitas.
  // Ex.: 0x7f000001, 0177.0.0.1, 2130706433
  const ipv4Hex = /^0x[0-9a-f]+$/i.test(hostname);
  const ipv4Octalish = /^0\d+(?:\.0\d+){3}$/.test(hostname);
  const ipv4Integer = /^\d{8,12}$/.test(hostname);

  return ipv4 || ipv6 || ipv4Hex || ipv4Octalish || ipv4Integer;
}

function isBlockedIp(ip: string): string | null {
  for (const pattern of BLOCKED_IP_RANGES) {
    if (pattern.test(ip)) return 'Private/internal IP addresses are not allowed';
  }
  return null;
}

export async function validateWebhookUrl(url: string): Promise<ValidationResult> {
  try {
    // 1. Verificar se é HTTPS
    if (!url.startsWith('https://')) {
      return {
        isValid: false,
        error: 'Only HTTPS URLs are allowed for security reasons',
      };
    }

    // 2. Parse da URL
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // 2.1 Não permitir credenciais na URL
    if (parsedUrl.username || parsedUrl.password) {
      return {
        isValid: false,
        error: 'URLs with embedded credentials are not allowed',
      };
    }

    // 3. Verificar hostnames bloqueados
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return {
        isValid: false,
        error: 'This hostname is not allowed',
      };
    }

    // 4. Verificar se hostname é IP direto
    const isIpAddress = isPossiblyIpLiteral(hostname);

    if (isIpAddress) {
      // Verificar se IP está em range bloqueado
      const blockedReason = isBlockedIp(hostname);
      if (blockedReason) {
        return { isValid: false, error: blockedReason };
      }
    } else {
      // 5. Resolver DNS e verificar IPs resultantes (com timeout)
      try {
        const dnsResult = await withTimeout(
          Deno.resolveDns(hostname, 'A'),
          5000,
          'DNS resolution timed out',
        );
        
        for (const ip of dnsResult) {
          const blockedReason = isBlockedIp(ip);
          if (blockedReason) {
            return {
              isValid: false,
              error: `Hostname resolves to a blocked IP address: ${ip}`,
            };
          }
        }

        // Verificar também IPv6
        const dnsResult6 = await withTimeout(
          Deno.resolveDns(hostname, 'AAAA'),
          5000,
          'DNS resolution timed out',
        ).catch(() => []);
        for (const ip of dnsResult6) {
          const blockedReason = isBlockedIp(ip);
          if (blockedReason) {
            return {
              isValid: false,
              error: `Hostname resolves to a blocked IPv6 address: ${ip}`,
            };
          }
        }
      } catch (error) {
        return {
          isValid: false,
          error: 'Failed to resolve DNS for hostname',
        };
      }
    }

    // 6. Verificar porta (bloquear portas privilegiadas exceto 443)
    const port = parsedUrl.port || '443';
    if (port !== '443' && parseInt(port) < 1024) {
      return {
        isValid: false,
        error: 'Privileged ports (< 1024) are not allowed except 443',
      };
    }

    // 6.1 Bloquear portas comumente sensíveis mesmo quando > 1024
    const blockedPorts = new Set([
      '22', // SSH
      '23', // Telnet
      '25', // SMTP
      '110',
      '143',
      '465',
      '587',
      '993',
      '995',
      '3306', // MySQL
      '5432', // Postgres
      '6379', // Redis
      '27017', // MongoDB
    ]);

    if (parsedUrl.port && blockedPorts.has(parsedUrl.port)) {
      return {
        isValid: false,
        error: `This port is not allowed for webhooks: ${parsedUrl.port}`,
      };
    }

    return { isValid: true };

  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }
}
