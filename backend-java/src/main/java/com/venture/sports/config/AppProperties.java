package com.venture.sports.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * Type-safe view of the "app.*" section of application.yml.
 * If a required secret is missing, the application refuses to start
 * (instead of silently falling back to a weak default like the old "ava").
 */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(@Valid Jwt jwt, Cors cors, Mail mail, Otp otp, Ai ai) {

    public record Jwt(
            @NotBlank @Size(min = 32, message = "JWT_ACCESS_SECRET must be at least 32 characters") String accessSecret,
            @NotBlank @Size(min = 32, message = "JWT_REFRESH_SECRET must be at least 32 characters") String refreshSecret,
            long accessTokenMinutes,
            long refreshTokenDays) {
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Mail(String from) {
    }

    public record Otp(int expiryMinutes, int maxAttempts) {
    }

    public record Ai(String geminiApiKey, String geminiModel, int timeoutSeconds) {
    }
}
