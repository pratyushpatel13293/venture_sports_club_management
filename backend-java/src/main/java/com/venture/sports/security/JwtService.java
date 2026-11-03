package com.venture.sports.security;

import com.venture.sports.config.AppProperties;
import com.venture.sports.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Creates and checks JSON Web Tokens.
 *
 * A JWT is three Base64 parts: header.payload.signature
 *   payload   = {"sub":"<userId>","username":"...","exp":1730000000}
 *   signature = HMAC-SHA256(header + "." + payload, secret)
 * Anyone can read the payload, but only the server (which knows the secret)
 * can produce a valid signature, so a token can't be forged or edited.
 *
 * Two different secrets are used so a refresh token can never be used as an access token.
 */
@Service
public class JwtService {

    private static final String TYPE_CLAIM = "type";

    private final SecretKey accessKey;
    private final SecretKey refreshKey;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtService(AppProperties props) {
        this.accessKey = Keys.hmacShaKeyFor(props.jwt().accessSecret().getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(props.jwt().refreshSecret().getBytes(StandardCharsets.UTF_8));
        this.accessTtl = Duration.ofMinutes(props.jwt().accessTokenMinutes());
        this.refreshTtl = Duration.ofDays(props.jwt().refreshTokenDays());
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId())
                .claim("id", user.getId())          // the React app reads payload.id
                .claim("username", user.getUsername())
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .claim(TYPE_CLAIM, "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(accessKey)
                .compact();
    }

    public String createRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId())
                .id(UUID.randomUUID().toString())   // makes every refresh token unique
                .claim(TYPE_CLAIM, "refresh")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTtl)))
                .signWith(refreshKey)
                .compact();
    }

    /** @throws JwtException if the token is expired, tampered with, or not an access token */
    public AuthUser parseAccessToken(String token) {
        Claims claims = Jwts.parser().verifyWith(accessKey).build().parseSignedClaims(token).getPayload();
        if (!"access".equals(claims.get(TYPE_CLAIM, String.class))) {
            throw new JwtException("Not an access token");
        }
        return new AuthUser(
                claims.getSubject(),
                claims.get("username", String.class),
                claims.get("name", String.class),
                claims.get("email", String.class));
    }

    /** @return the user id inside a valid refresh token */
    public String parseRefreshToken(String token) {
        Claims claims = Jwts.parser().verifyWith(refreshKey).build().parseSignedClaims(token).getPayload();
        if (!"refresh".equals(claims.get(TYPE_CLAIM, String.class))) {
            throw new JwtException("Not a refresh token");
        }
        return claims.getSubject();
    }

    /** We store only a SHA-256 hash of the refresh token in the database. */
    public static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
