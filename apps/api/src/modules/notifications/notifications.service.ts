import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NotificationPayload {
  to: string;
  title?: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private config: ConfigService) {}

  async sendSms(phone: string, message: string): Promise<void> {
    // TODO: Integrate MSG91 / Twilio
    this.logger.log(`SMS to ${phone}: ${message}`);
  }

  async sendWhatsApp(phone: string, message: string): Promise<void> {
    // TODO: Integrate Green API WhatsApp
    this.logger.log(`WhatsApp to ${phone}: ${message}`);
  }

  async sendPush(fcmToken: string, title: string, body: string, data?: any): Promise<void> {
    // TODO: Integrate Firebase Admin SDK
    this.logger.log(`Push to ${fcmToken}: ${title} - ${body}`);
  }

  async sendEmail(email: string, subject: string, html: string): Promise<void> {
    // TODO: Integrate Nodemailer / SendGrid
    this.logger.log(`Email to ${email}: ${subject}`);
  }

  async notifyKycApproved(userId: string, phone: string): Promise<void> {
    await Promise.all([
      this.sendSms(phone, 'Your KYC has been approved! You can now proceed with your rental booking.'),
      this.sendWhatsApp(phone, '✅ KYC Approved! Your dbugg rental KYC verification is complete. Book your laptop now.'),
    ]);
  }

  async notifyOrderShipped(phone: string, orderId: string, trackingId: string): Promise<void> {
    await this.sendWhatsApp(phone, `📦 Order #${orderId} shipped! Track: ${trackingId}`);
  }

  async notifyRentDue(phone: string, amount: number, dueDate: string): Promise<void> {
    await Promise.all([
      this.sendSms(phone, `Reminder: Rent ₹${amount} due on ${dueDate}. Pay via dbugg app.`),
      this.sendWhatsApp(phone, `⏰ Rental reminder: ₹${amount} due on ${dueDate}. Tap to pay.`),
    ]);
  }
}
