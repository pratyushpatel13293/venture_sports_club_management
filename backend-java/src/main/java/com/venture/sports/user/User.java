package com.venture.sports.user;

import com.venture.sports.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A person using the platform.
 *
 * Mongo stored arrays inside the user (events, clubs, notifications). In SQL each of those
 * relationships lives in its own table instead (club_members, event_participants,
 * notifications), so there is exactly one source of truth for each fact.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 60)
    private String username;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    /** BCrypt hash, never the plain password. */
    @Column(nullable = false)
    private String password;

    /** SHA-256 hash of the refresh token currently allowed for this user (null = logged out). */
    @Column(length = 64)
    private String currentRefreshTokenHash;

    private String rollNumber;

    private boolean verified;

    @Column(length = 20)
    private String gender;
}
