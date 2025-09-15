import * as SibApiV3Sdk from '@sendinblue/client';

export const sendOtpEmail = async (email: string, otp: string) => {
  try {
    console.log('📧 Attempting to send OTP email to:', email);
    console.log('🔑 OTP to send:', otp);
    
    // Check if API key exists
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY not found in environment variables');
      throw new Error('BREVO_API_KEY not found in environment variables');
    }

    console.log('✅ BREVO_API_KEY found');
    console.log('📮 Using Brevo (Sendinblue) for email delivery');

    // Initialize Brevo API
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    // Email configuration
    sendSmtpEmail.sender = { 
      name: 'YatraID', 
      email: process.env.FROM_EMAIL || 'parikshitjaiswal82@gmail.com'
    };
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.subject = 'YatraID Registration - OTP Verification';
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🌍 YatraID</h1>
          <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">Digital Tourist Identity Platform</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #e5f3ff 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">🔐 Verify Your Registration</h2>
          <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">Enter this OTP to complete your YatraID registration:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <div style="background: #ffffff; border: 3px solid #3b82f6; border-radius: 12px; padding: 25px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <h1 style="color: #1f2937; font-size: 36px; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace; font-weight: bold;">${otp}</h1>
            </div>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center;">
              ⏰ <strong>Valid for 10 minutes</strong> | 🔒 <strong>Keep it confidential</strong> | 🚫 <strong>Don't share with anyone</strong>
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p style="margin: 5px 0;">🛡️ Secure Tourist Identity Platform</p>
          <p style="margin: 0;">© 2025 YatraID - Powered by Digital Innovation</p>
        </div>
      </div>
    `;

    console.log('📤 Sending email via Brevo...');
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Email sent successfully via Brevo');
    console.log('📧 Message ID:', result.body.messageId);
    console.log('📬 Email sent to:', email);
    
    return result.body;

  } catch (error: any) {
    console.error('❌ Brevo email sending failed:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      response: error.response?.body
    });
    
    // More specific error handling
    if (error.code === 401) {
      throw new Error('Brevo authentication failed. Please check your BREVO_API_KEY.');
    } else if (error.code === 400) {
      throw new Error('Brevo API error: Invalid request. Please check sender email verification.');
    } else if (error.response?.body?.message) {
      throw new Error(`Brevo API error: ${error.response.body.message}`);
    } else {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
};