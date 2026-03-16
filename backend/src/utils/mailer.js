const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Mailer init:', process.env.GMAIL_USER);

const transporter = nodemailer.createTransport({
  host: '74.125.133.109', // smtp.gmail.com IPv4 direct
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

// Test la connexion au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail connection failed:', error.message);
  } else {
    console.log('✅ Gmail ready to send emails !');
  }
});

const sendVerificationEmail = async (email, username, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  console.log('📤 Sending email to:', email);
  
  const result = await transporter.sendMail({
    from: `"NKTCTF" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '🔐 NKTCTF — Vérifie ton email',
    html: `
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
    `,
  });
  
  console.log('✅ Email sent:', result.messageId);
  return result;
};

module.exports = { sendVerificationEmail, transporter };