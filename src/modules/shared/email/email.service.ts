import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailDto {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async send(dto: SendEmailDto): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>(
          'SMTP_FROM',
          'Ngola Bazaar <no-reply@ngolabazaar.com>',
        ),
        to: dto.to,
        subject: dto.subject,
        html: dto.html,
      });
      this.logger.log(`Email sent to ${dto.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${dto.to}: ${error}`);
    }
  }

  async sendStoreCredentials(
    to: string,
    storeName: string,
    userName: string,
    email: string,
    password: string,
  ): Promise<void> {
    const subject = `Bem-vindo ao Ngola Bazaar - Sua loja "${storeName}" foi criada!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF5722;">Bem-vindo ao Ngola Bazaar!</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Sua loja <strong>"${storeName}"</strong> foi criada com sucesso!</p>
        <p>Aqui estão os seus dados de acesso:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Senha:</strong> ${password}</p>
        </div>
        <p style="color: #e53935;"><strong>IMPORTANTE:</strong> Recomendamos que altere a sua senha após o primeiro login.</p>
        <p>Pode aceder ao painel da sua loja em: <a href="${this.configService.get<string>('FRONTEND_URL', 'https://ngolabazaar.com')}/login">Clique aqui</a></p>
        <br/>
        <p>Atenciosamente,<br/>Equipa Ngola Bazaar</p>
      </div>
    `;
    await this.send({ to, subject, html });
  }
}
