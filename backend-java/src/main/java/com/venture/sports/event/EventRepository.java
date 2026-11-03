package com.venture.sports.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, String> {

    /** Events where the user is an admin, a manager or a participant. */
    @Query("""
            SELECT DISTINCT e FROM Event e
            LEFT JOIN e.admins a
            LEFT JOIN e.managers m
            LEFT JOIN e.participants p
            WHERE a.id = :userId OR m.id = :userId OR p.id = :userId
            ORDER BY e.createdAt DESC
            """)
    List<Event> findEventsOfUser(@Param("userId") String userId);

    @Query("SELECT e FROM Event e JOIN e.admins a WHERE a.id = :userId")
    List<Event> findEventsAdministeredBy(@Param("userId") String userId);

    List<Event> findByClubIdOrderByCreatedAtAsc(String clubId);
}
