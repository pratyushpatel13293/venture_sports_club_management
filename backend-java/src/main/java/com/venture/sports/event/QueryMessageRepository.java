package com.venture.sports.event;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QueryMessageRepository extends JpaRepository<QueryMessage, String> {

    /** Organiser view: every query of the event. */
    @EntityGraph(attributePaths = {"sender", "targetUser"})
    List<QueryMessage> findByEventIdOrderByCreatedAtAsc(String eventId);

    /** Participant view: only their own private conversation. */
    @EntityGraph(attributePaths = {"sender", "targetUser"})
    @Query("""
            SELECT q FROM QueryMessage q
            LEFT JOIN q.targetUser t
            WHERE q.event.id = :eventId
              AND q.visibility = 'private'
              AND (q.sender.id = :userId OR t.id = :userId)
            ORDER BY q.createdAt ASC
            """)
    List<QueryMessage> findConversation(@Param("eventId") String eventId, @Param("userId") String userId);
}
