package com.venture.sports.club;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    /** Newest first; the service reverses the page so the UI shows oldest -> newest. */
    @EntityGraph(attributePaths = "sender")
    List<ChatMessage> findByClubIdOrderByCreatedAtDesc(String clubId, Pageable pageable);
}
