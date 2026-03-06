const https = require('https');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = 'smileemr10@gmail.com';
const FROM_NAME = 'NKTCTF';

const sendEmail = (to, subject, htmlContent) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent,
    });

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Email sent via Brevo API');
          resolve(body);
        } else {
          console.error('❌ Brevo API error:', res.statusCode, body);
          reject(new Error(`Brevo error: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const sendVerificationEmail = async (email, username, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const htmlContent = `
    <div style="background:#080d14;color:#c9d8e8;font-family:monospace;padding:40px;max-width:500px;margin:0 auto;border:1px solid #1a2a3a;border-radius:8px;">
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#00ff88;font-size:28px;letter-spacing:4px;margin:0;">NKTCTF</h1>
        <p style="color:#4a6070;font-size:11px;letter-spacing:6px;margin:5px 0;">WHERE HACKERS RISE 🇲🇷</p>
      </div>
      <div style="border-top:1px solid #1a2a3a;padding-top:25px;">
        <p style="color:#c9d8e8;">Salut <strong style="color:#00ff88;">${username}</strong>,</p>
        <p style="color:#4a6070;font-size:13px;">Tu t'es inscrit sur NKTCTF. Clique sur le bouton ci-dessous pour vérifier ton adresse email.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${url}" style="background:#00ff88;color:#080d14;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:2px;">
            [ VERIFY EMAIL ]
          </a>
        </div>
        <p style="color:#4a6070;font-size:11px;">Ou copie ce lien :</p>
        <p style="color:#00d4ff;font-size:11px;word-break:break-all;">${url}</p>
        <p style="color:#4a6070;font-size:11px;margin-top:20px;">Ce lien expire dans 24h.</p>
      </div>
    </div>
  `;

  return sendEmail(email, '🔐 NKTCTF — Vérifie ton email', htmlContent);
};

module.exports = { sendVerificationEmail };