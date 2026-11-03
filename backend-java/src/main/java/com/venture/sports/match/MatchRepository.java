package com.venture.sports.match;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, String> {

    List<Match> findByEventIdAndStatusNotOrderByCreatedAtAsc(String eventId, MatchStatus status);

    List<Match> findByEventIdAndStatus(String eventId, MatchStatus status);

    List<Match> findByScheduleIdOrderBySlotIndexAsc(String scheduleId);

    long countByScheduleId(String scheduleId);

    List<Match> findByStageIdOrderBySlotIndexAsc(String stageId);

    List<Match> findByEventId(String eventId);

    /** How many matches reference this team (as team A, team B or winner)? */
    @Query("""
            SELECT count(m) FROM Match m
            LEFT JOIN m.teamA.team ta
            LEFT JOIN m.teamB.team tb
            LEFT JOIN m.winner w
            WHERE ta.id = :teamId OR tb.id = :teamId OR w.id = :teamId
            """)
    long countMatchesUsingTeam(@Param("teamId") String teamId);

    /** Break the next-match links first, otherwise the self-referencing foreign key blocks deletes. */
    @Modifying
    @Query("UPDATE Match m SET m.nextMatch = null WHERE m.event.id = :eventId")
    void unlinkNextMatches(@Param("eventId") String eventId);
}
