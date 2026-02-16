# Verificando assinaturas de webhook

Todos os webhooks enviados pelo ZapFllow incluem uma assinatura HMAC-SHA256 no header `X-Webhook-Signature`.

## Headers enviados

- `X-Webhook-Id`: ID do webhook no ZapFllow
- `X-Webhook-Timestamp`: timestamp em milissegundos (epoch)
- `X-Webhook-Signature`: assinatura HMAC-SHA256 (hex) do corpo JSON (stringificado)

> O corpo assinado é exatamente o JSON enviado no request (string `JSON.stringify(payload)`), sem prefixos.

## Exemplo (Node.js / Express)

```js
const crypto = require('crypto');

app.post('/webhook', express.json(), (req, res) => {
  const signature = String(req.headers['x-webhook-signature'] || '');
  const timestamp = Number(req.headers['x-webhook-timestamp'] || 0);

  // 1) Replay protection (5 min)
  const now = Date.now();
  if (!timestamp || Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return res.status(401).send('Invalid timestamp');
  }

  // 2) Verify signature
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).send('Invalid signature');
  }

  // 3) Process webhook...
  res.status(200).send('OK');
});
```

## Proteção contra replay (nonce)

Além do timestamp, recomendamos armazenar assinaturas recentemente vistas (por exemplo, por 5 minutos) e rejeitar se a mesma assinatura reaparecer.
