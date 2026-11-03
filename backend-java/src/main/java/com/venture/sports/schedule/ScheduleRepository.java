package com.venture.sports.schedule;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, String> {

    List<Schedule> findByEventIdOrderByCreatedAtAsc(String eventId);
}
