package com.venture.sports.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request bodies for /auth endpoints. Bean Validation rejects bad input with 400 before our code runs. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record SignupRequest(
            @NotBlank @Size(min = 3, max = 60) String username,
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6, max = 100) String password,
            @JsonProperty("roll_number") String rollNumber,
            String gender) {
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record RefreshRequest(String refreshToken) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    public record VerifyOtpRequest(@NotBlank @Email String email, @NotBlank String otp) {
    }

    public record ResetPasswordRequest(String email, @NotBlank @Size(min = 6, max = 100) String newPassword) {
    }

    public record SearchUsersRequest(String q) {
    }
}
