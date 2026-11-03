package com.venture.sports.event;

import com.venture.sports.common.ApiException;
import com.venture.sports.match.MatchRepository;
import com.venture.sports.match.StageRepository;
import com.venture.sports.schedule.ScheduleRepository;
import com.venture.sports.team.Team;
import com.venture.sports.team.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deletes an event and everything that belongs to it, child tables first:
 *
 *   matches (+ rounds) -> stages -> schedules -> teams (+ requests, notifications) -> event
 *
 * Chat messages and support queries are removed by the database itself
 * (their foreign keys are ON DELETE CASCADE).
 * Everything runs in one transaction: if any step fails, nothing is deleted.
 */
@Service
@RequiredArgsConstructor
public class EventDeletionService {

    private final EventRepository events;
    private final MatchRepository matches;
    private final StageRepository stages;
    private final ScheduleRepository schedules;
    private final TeamRepository teams;

    @Transactional
    public void deleteEventCompletely(Event event) {
        String eventId = event.getId();

        matches.unlinkNextMatches(eventId);
        matches.deleteAll(matches.findByEventId(eventId));
        matches.flush();

        stages.deleteAll(stages.findByEventIdOrderByStageOrderAsc(eventId));
        schedules.deleteAll(schedules.findByEventIdOrderByCreatedAtAsc(eventId));
        teams.deleteAll(teams.findByEventIdOrderByCreatedAtAsc(eventId));
        teams.flush();

        if (event.getClub() != null) event.getClub().getEvents().remove(event);
        events.delete(event);
    }

    /** A team can only be deleted while no match refers to it. */
    @Transactional
    public void deleteTeam(Team team) {
        if (matches.countMatchesUsingTeam(team.getId()) > 0) {
            throw ApiException.badRequest("This team is already part of the match schedule and can't be deleted");
        }
        team.getEvent().getTeams().remove(team);
        teams.delete(team);
    }
}
