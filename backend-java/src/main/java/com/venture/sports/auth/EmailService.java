package com.venture.sports.auth;

import com.venture.sports.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends e-mails through SMTP (e.g. a Gmail "app password").
 *
 * If MAIL_HOST is not configured, Spring creates no JavaMailSender bean; we then just log
 * the message so the forgot-password flow still works on a laptop during development.
 */
@Slf4j
@Service
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;
    private final boolean configured;

    public EmailService(ObjectProvider<JavaMailSender> mailSender, AppProperties props,
                        @Value("${spring.mail.host:}") String mailHost) {
        this.mailSender = mailSender;
        this.from = props.mail().from();
        this.configured = mailHost != null && !mailHost.isBlank();
    }

    public void sendOtp(String to, String otp, int validMinutes) {
        String subject = "Your Venture password reset code";
        String body = "Your one-time code is " + otp + "\n\nIt expires in " + validMinutes
                + " minutes. If you didn't ask to reset your password, ignore this e-mail.";

        JavaMailSender sender = configured ? mailSender.getIfAvailable() : null;
        if (sender == null) {
            log.warn("MAIL_HOST not configured - OTP for {} is {} (dev mode, not e-mailed)", to, otp);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        try {
            sender.send(message);
        } catch (MailException e) {
            log.error("Failed to send OTP e-mail to {}", to, e);
            throw new IllegalStateException("Could not send e-mail", e);
        }
    }
}
