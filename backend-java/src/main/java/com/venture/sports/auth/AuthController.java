package com.venture.sports.auth;

import com.venture.sports.auth.AuthDtos.*;
import com.venture.sports.security.AuthUser;
import com.venture.sports.web.Views.MeView;
import com.venture.sports.web.Views.UserRef;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controllers only translate HTTP <-> Java: read the path/body, call the service, return the result.
 * All business rules live in AuthService.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public Map<String, Object> signup(@Valid @RequestBody SignupRequest req) {
        return authService.signup(req, null);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req, null);
    }

    /** Sign up through a club invite link and join that club. */
    @PostMapping("/{clubId}/signup")
    public Map<String, Object> signupToClub(@PathVariable String clubId, @Valid @RequestBody SignupRequest req) {
        return authService.signup(req, clubId);
    }

    /** Log in through a club invite link and join that club. */
    @PostMapping("/{clubId}/login")
    public Map<String, Object> loginToClub(@PathVariable String clubId, @Valid @RequestBody LoginRequest req) {
        return authService.login(req, clubId);
    }

    @PostMapping("/refresh")
    public Map<String, Object> refresh(@RequestBody(required = false) RefreshRequest req) {
        return authService.refresh(req == null ? null : req.refreshToken());
    }

    @GetMapping("/me")
    public MeView me(@AuthenticationPrincipal AuthUser me) {
        return authService.me(me.id());
    }

    @PostMapping("/search-users")
    public List<UserRef> searchUsers(@RequestBody SearchUsersRequest req) {
        return authService.searchUsers(req.q());
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req.email());
        return Map.of("message", "If an account exists for this e-mail, an OTP has been sent");
    }

    @PostMapping("/verify-forgot-otp")
    public Map<String, String> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        authService.verifyOtp(req.email(), req.otp());
        return Map.of("message", "OTP verified");
    }

    /** me is null when called without a token (forgot-password flow). */
    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@AuthenticationPrincipal AuthUser me,
                                             @Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(me, req.email(), req.newPassword());
        return Map.of("message", "Password updated successfully");
    }
}
