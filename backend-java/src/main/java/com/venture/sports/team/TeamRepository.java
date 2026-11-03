package com.venture.sports.team;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<Team, String> {

    List<Team> findByEventIdOrderByCreatedAtAsc(String eventId);

    List<Team> findByEventIdAndRegisteredTrueOrderByCreatedAtAsc(String eventId);

    boolean existsByEventIdAndLeaderId(String eventId, String leaderId);

    /** Is this user already in any team of the event? (one team per player per event) */
    @Query("SELECT t FROM Team t JOIN t.members m WHERE t.event.id = :eventId AND m.id = :userId")
    Optional<Team> findTeamOfMember(@Param("eventId") String eventId, @Param("userId") String userId);

    @Query("SELECT t FROM Team t JOIN t.members m WHERE t.event.id IN :eventIds AND m.id = :userId")
    List<Team> findTeamsOfMemberInEvents(@Param("eventIds") List<String> eventIds, @Param("userId") String userId);
}
