package com.venture.sports.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface OtpRepository extends JpaRepository<OtpCode, String> {

    Optional<OtpCode> findFirstByEmailOrderByCreatedAtDesc(String email);

    @Modifying
    @Query("DELETE FROM OtpCode o WHERE o.email = :email")
    void deleteAllByEmail(@Param("email") String email);

    @Modifying
    @Query("DELETE FROM OtpCode o WHERE o.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);
}
