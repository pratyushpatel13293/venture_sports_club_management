package com.venture.sports.match;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StageRepository extends JpaRepository<Stage, String> {

    List<Stage> findByEventIdOrderByStageOrderAsc(String eventId);

    boolean existsByEventId(String eventId);

    Optional<Stage> findFirstByEventIdAndName(String eventId, String name);
}
