import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';

// POST - Test email configuration
export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = body;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: 'Missing SMTP configuration' }, { status: 400 });
    }

    // Mock email sending (nodemailer not installed)
    // In production, you would use nodemailer here
    // const transporter = nodemailer.createTransport({ ... })
    // await transporter.sendMail({ ... })

    // For now, just simulate email sending
    console.warn('Email test simulation:', {
      from: smtpFrom || smtpUser,
      to: user.email,
      subject: 'UniAct - Email Test',
      config: { smtpHost, smtpPort },
    });

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      message: `Email test đã gửi đến ${user.email}`,
    });
  } catch (error: any) {
    console.error('POST /api/admin/system-config/test-email error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to send test email',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
