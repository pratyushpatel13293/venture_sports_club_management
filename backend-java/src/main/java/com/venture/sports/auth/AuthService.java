package com.venture.sports.auth;

import com.venture.sports.auth.AuthDtos.LoginRequest;
import com.venture.sports.auth.AuthDtos.SignupRequest;
import com.venture.sports.club.Club;
import com.venture.sports.club.ClubRepository;
import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.EventRepository;
import com.venture.sports.security.AuthUser;
import com.venture.sports.security.JwtService;
import com.venture.sports.user.User;
import com.venture.sports.user.UserRepository;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.Views.MeView;
import com.venture.sports.web.Views.UserRef;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Sign-up, login, token refresh and password reset.
 *
 * Login flow:
 *   1. find user by e-mail
 *   2. BCrypt-compare the password with the stored hash
 *   3. issue a short-lived access token + a long-lived refresh token
 *   4. store a hash of the refresh token, so logging in elsewhere / resetting the password
 *      makes the old refresh token useless (only one "current" token per user)
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final ClubRepository clubs;
    private final EventRepository events;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final EmailService emailService;
    private final Finder finder;
    private final ViewMapper mapper;

    @Transactional
    public Map<String, Object> signup(SignupRequest req, String clubIdOrNull) {
        String email = normalizeEmail(req.email());
        if (users.existsByEmailIgnoreCase(email) || users.existsByUsernameIgnoreCase(req.username().trim())) {
            throw ApiException.badRequest("User already exists!");
        }
        // Check the club BEFORE creating the user, so a bad club link doesn't leave a half-created account.
        Club club = clubIdOrNull == null ? null : finder.club(clubIdOrNull);

        User user = new User();
        user.setUsername(req.username().trim());
        user.setName(req.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setRollNumber(req.rollNumber());
        user.setGender(req.gender());
        users.save(user);

        if (club != null) club.getMembers().add(user);

        return issueTokens(user, "Signup successful");
    }

    @Transactional
    public Map<String, Object> login(LoginRequest req, String clubIdOrNull) {
        User user = users.findByEmailIgnoreCase(normalizeEmail(req.email()))
                .filter(u -> passwordEncoder.matches(req.password(), u.getPassword()))
                // Same message for "no such user" and "wrong password": don't reveal which e-mails exist.
                // 400 (not 401) because the React app treats every 401 as "access token expired".
                .orElseThrow(() -> ApiException.badRequest("Invalid email or password"));

        if (clubIdOrNull != null) {
            finder.club(clubIdOrNull).getMembers().add(user);
        }
        return issueTokens(user, "Login successful");
    }

    @Transactional
    public Map<String, Object> refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw ApiException.unauthorized("No refresh token provided");
        }
        String userId;
        try {
            userId = jwtService.parseRefreshToken(refreshToken);
        } catch (JwtException | IllegalArgumentException e) {
            throw ApiException.unauthorized("Invalid refresh token");
        }
        User user = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("User not found"));
        if (!JwtService.sha256(refreshToken).equals(user.getCurrentRefreshTokenHash())) {
            throw ApiException.unauthorized("Invalid refresh token");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("accessToken", jwtService.createAccessToken(user));
        body.put("refreshToken", refreshToken);
        return body;
    }

    @Transactional(readOnly = true)
    public MeView me(String userId) {
        User user = finder.user(userId);
        List<String> clubIds = clubs.findClubsOfMember(userId).stream().map(Club::getId).toList();
        List<String> eventIds = events.findEventsOfUser(userId).stream().map(e -> e.getId()).toList();
        return mapper.me(user, clubIds, eventIds);
    }

    @Transactional(readOnly = true)
    public List<UserRef> searchUsers(String q) {
        if (q == null || q.trim().length() < 1) return List.of();
        return users.search(q.trim(), PageRequest.of(0, 10)).stream().map(mapper::userRefWithGender).toList();
    }

    /** Always answers the same way, whether or not the e-mail exists (prevents account discovery). */
    @Transactional
    public void forgotPassword(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        if (users.existsByEmailIgnoreCase(email)) {
            String code = otpService.createFor(email);
            emailService.sendOtp(email, code, otpService.validityMinutes());
        }
    }

    public void verifyOtp(String email, String otp) {
        otpService.verify(normalizeEmail(email), otp);
    }

    /**
     * Two ways in:
     *  - logged in (valid access token)       -> change your own password
     *  - not logged in (forgot-password flow)  -> e-mail must have a freshly verified OTP
     */
    @Transactional
    public void resetPassword(AuthUser me, String rawEmail, String newPassword) {
        User user;
        if (me != null) {
            user = finder.user(me.id());
        } else {
            if (rawEmail == null || rawEmail.isBlank()) throw ApiException.badRequest("Email is required");
            String email = normalizeEmail(rawEmail);
            if (!otpService.consumeVerified(email)) {
                throw ApiException.badRequest("Verify the OTP sent to your e-mail first");
            }
            user = users.findByEmailIgnoreCase(email).orElseThrow(() -> ApiException.notFound("User not found"));
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setCurrentRefreshTokenHash(null);   // log out other devices
    }

    private Map<String, Object> issueTokens(User user, String message) {
        String accessToken = jwtService.createAccessToken(user);
        String refreshToken = jwtService.createRefreshToken(user);
        user.setCurrentRefreshTokenHash(JwtService.sha256(refreshToken));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("accessToken", accessToken);
        body.put("refreshToken", refreshToken);
        body.put("user", mapper.loginUser(user));
        return body;
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
