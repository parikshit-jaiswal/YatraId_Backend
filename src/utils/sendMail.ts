import nodemailer from 'nodemailer';

export const sendOtpEmail = async (email: string, otp: string) => {
  try {
    console.log('📧 Attempting to send OTP email to:', email);
    console.log('🔑 OTP to send:', otp);
    
    // Check environment variables
    console.log('Environment check:');
    console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);
    console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    // Don't log EMAIL_PASS for security

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing: EMAIL_USER or EMAIL_PASS not found in environment variables');
    }

    // FIXED: More robust Gmail SMTP configuration
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,     // 5 seconds
      socketTimeout: 10000       // 10 seconds
    });

    console.log('📮 Email transporter created successfully');

    // IMPORTANT: Test the connection first
    console.log('🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    const mailOptions = {
      from: `"YatraID" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'YatraID Registration - OTP Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">YatraID</h1>
            <p style="color: #6b7280; margin: 5px 0;">Digital Tourist Identity Platform</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify Your Registration</h2>
            <p style="color: #4b5563; font-size: 16px;">Your OTP for YatraID registration is:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <div style="background: #ffffff; border: 2px dashed #e5e7eb; border-radius: 8px; padding: 20px; display: inline-block;">
                <h1 style="color: #1f2937; font-size: 32px; letter-spacing: 8px; margin: 0; font-family: monospace;">${otp}</h1>
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              • This OTP will expire in <strong>10 minutes</strong><br>
              • Do not share this code with anyone<br>
              • If you didn't request this, please ignore this email
            </p>
          </div>
          
          <div style="text-align: center; color: #9ca3af; font-size: 12px;">
            <p>© 2025 YatraID - Secure Digital Tourist Identity</p>
          </div>
        </div>
      `
    };

    console.log('📤 Sending email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    
    return result;

  } catch (error: any) {
    console.error('❌ Email sending failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command
    });
    
    // More specific error messages
    if (error.code === 'ETIMEDOUT') {
      throw new Error('Email service connection timeout. This might be due to network restrictions on your hosting provider.');
    } else if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your EMAIL_USER and EMAIL_PASS credentials.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Gmail SMTP server not found. Please check your internet connection.');
    } else if (error.responseCode === 535) {
      throw new Error('Invalid email credentials. For Gmail, use App Password instead of regular password.');
    } else {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
};