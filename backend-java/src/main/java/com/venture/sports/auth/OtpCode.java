package com.venture.sports.auth;

import com.venture.sports.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A one-time password for "forgot password".
 * We store only a BCrypt hash of the code, so a database leak doesn't leak valid codes.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "otp_codes", indexes = @Index(name = "idx_otp_email", columnList = "email"))
public class OtpCode extends BaseEntity {

    @Column(nullable = false, length = 180)
    private String email;

    @Column(nullable = false)
    private String codeHash;

    @Column(nullable = false)
    private Instant expiresAt;

    /** Wrong guesses so far; the code is burned after app.otp.max-attempts. */
    private int attempts;

    /** Set once the correct code was entered; allows exactly one password reset. */
    private Instant verifiedAt;

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }
}
