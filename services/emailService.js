require("dotenv").config(); // ensure env vars are loaded even if called early
const SibApiV3Sdk = require("sib-api-v3-sdk");

// Initialize the Brevo client with your API key from .env
const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendWelcomeEmail = async ({
  fullName,
  email,
  password,
  role,
  employeeId,
}) => {
  try {
    await transactionalEmailsApi.sendTransacEmail({
      sender: {
        name: process.env.EMAIL_FROM_NAME || "HR System",
        email: process.env.EMAIL_FROM || "mirmiresaccos63@gmail.com",
      },
      to: [{ email, name: fullName }],
      subject: "Welcome! Your Account Has Been Created",
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
                  
                  <tr>
                    <td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:26px;">Welcome to the Team!</h1>
                      <p style="margin:8px 0 0;color:#dcfce7;font-size:15px;">Your account has been created successfully</p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:40px;">
                      <p style="margin:0 0 24px;color:#374151;font-size:16px;">Hi <strong>${fullName}</strong>,</p>
                      <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
                        Your account has been set up by the admin. Here are your login credentials.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:28px;">
                        <tr>
                          <td style="padding:28px;">
                            <p style="margin:0 0 16px;color:#15803d;font-size:12px;font-weight:700;text-transform:uppercase;">Your Login Credentials</p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              ${
                                employeeId
                                  ? `
                              <tr>
                                <td style="padding:8px 0;border-bottom:1px solid #dcfce7;color:#6b7280;font-size:13px;">Employee ID</td>
                                <td style="padding:8px 0;border-bottom:1px solid #dcfce7;text-align:right;"><strong style="color:#111827;">${employeeId}</strong></td>
                              </tr>`
                                  : ""
                              }
                              <tr>
                                <td style="padding:8px 0;border-bottom:1px solid #dcfce7;color:#6b7280;font-size:13px;">Role</td>
                                <td style="padding:8px 0;border-bottom:1px solid #dcfce7;text-align:right;">
                                  <span style="background:#dcfce7;color:#15803d;padding:2px 10px;border-radius:20px;font-size:12px;">
                                    ${role.charAt(0).toUpperCase() + role.slice(1)}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0;border-bottom:1px solid #dcfce7;color:#6b7280;font-size:13px;">Email</td>
                                <td style="padding:8px 0;border-bottom:1px solid #dcfce7;text-align:right;"><strong style="color:#111827;">${email}</strong></td>
                              </tr>
                              <tr>
                                <td style="padding:12px 0 0;color:#6b7280;font-size:13px;">Temporary Password</td>
                                <td style="padding:12px 0 0;text-align:right;">
                                  <strong style="color:#16a34a;font-size:18px;letter-spacing:2px;font-family:monospace;">${password}</strong>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:28px;">
                        <tr>
                          <td style="padding:16px 20px;">
                            <p style="margin:0;color:#92400e;font-size:13px;">
                              ⚠️ <strong>Security Notice:</strong> Please change your password immediately after first login.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                      <p style="margin:0;color:#9ca3af;font-size:12px;">This is an automated message. Please do not reply.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`[Email] Welcome email sent to ${email}`);
  } catch (err) {
    console.error(`[Email] Failed to send to ${email}:`, err.message);
  }
};

module.exports = { sendWelcomeEmail };
