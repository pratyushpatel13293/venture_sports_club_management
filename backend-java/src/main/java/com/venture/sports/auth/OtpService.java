package com.venture.sports.auth;

import com.venture.sports.common.ApiException;
import com.venture.sports.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

/**
 * One-time passwords for "forgot password".
 *
 *  forgot-password ──> create code (hash stored, plain code e-mailed), valid 10 min
 *  verify-forgot-otp ─> compare; max 5 wrong guesses, then the code is burned
 *  reset-password ───> only allowed if a code was verified in the last 10 min; then deleted
 */
@Slf4j
@Service
public class OtpService {

    /** SecureRandom, not Math.random(): OTPs must not be predictable. */
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpRepository otps;
    private final PasswordEncoder encoder;
    private final Duration validity;
    private final int maxAttempts;

    public OtpService(OtpRepository otps, PasswordEncoder encoder, AppProperties props) {
        this.otps = otps;
        this.encoder = encoder;
        this.validity = Duration.ofMinutes(props.otp().expiryMinutes());
        this.maxAttempts = props.otp().maxAttempts();
    }

    public int validityMinutes() {
        return (int) validity.toMinutes();
    }

    /** Creates a fresh code (old ones are removed) and returns the plain 6 digits. */
    @Transactional
    public String createFor(String email) {
        otps.deleteAllByEmail(email);
        String code = String.valueOf(100_000 + RANDOM.nextInt(900_000));
        OtpCode otp = new OtpCode();
        otp.setEmail(email);
        otp.setCodeHash(encoder.encode(code));
        otp.setExpiresAt(Instant.now().plus(validity));
        otps.save(otp);
        return code;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void verify(String email, String code) {
        OtpCode otp = otps.findFirstByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> ApiException.badRequest("Invalid or expired OTP"));

        if (otp.isExpired(Instant.now()) || otp.getAttempts() >= maxAttempts) {
            throw ApiException.badRequest("Invalid or expired OTP");
        }
        if (code == null || !encoder.matches(code.trim(), otp.getCodeHash())) {
            otp.setAttempts(otp.getAttempts() + 1);   // saved even though we throw (noRollbackFor)
            throw ApiException.badRequest("Invalid or expired OTP");
        }
        otp.setVerifiedAt(Instant.now());
    }

    /** True if this e-mail verified a code recently. Consumes the code. */
    @Transactional
    public boolean consumeVerified(String email) {
        boolean ok = otps.findFirstByEmailOrderByCreatedAtDesc(email)
                .map(o -> o.getVerifiedAt() != null && !o.isExpired(Instant.now()))
                .orElse(false);
        if (ok) otps.deleteAllByEmail(email);
        return ok;
    }

    /** Housekeeping job: every hour delete expired codes. */
    @Scheduled(fixedRate = 60 * 60 * 1000L)
    @Transactional
    public void cleanupExpired() {
        int removed = otps.deleteExpired(Instant.now());
        if (removed > 0) log.info("Removed {} expired OTP codes", removed);
    }
}
