package com.venture.sports.club;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ClubRepository extends JpaRepository<Club, String> {

    List<Club> findByAdminIdOrderByCreatedAtDesc(String adminId);

    @Query("SELECT c FROM Club c JOIN c.members m WHERE m.id = :userId ORDER BY c.createdAt DESC")
    List<Club> findClubsOfMember(@Param("userId") String userId);

    @Query("""
            SELECT count(c) FROM Club c LEFT JOIN c.members m
            WHERE c.id = :clubId AND (c.admin.id = :userId OR m.id = :userId)
            """)
    long countMembership(@Param("clubId") String clubId, @Param("userId") String userId);
}
