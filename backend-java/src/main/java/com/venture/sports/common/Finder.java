package com.venture.sports.common;

import com.venture.sports.club.Club;
import com.venture.sports.club.ClubRepository;
import com.venture.sports.event.Event;
import com.venture.sports.event.EventRepository;
import com.venture.sports.match.Match;
import com.venture.sports.match.MatchRepository;
import com.venture.sports.match.Stage;
import com.venture.sports.match.StageRepository;
import com.venture.sports.schedule.Schedule;
import com.venture.sports.schedule.ScheduleRepository;
import com.venture.sports.team.Team;
import com.venture.sports.team.TeamRepository;
import com.venture.sports.user.User;
import com.venture.sports.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * "Load this row or answer 404" in one line.
 * Replaces the repeated `if (!event) return res.status(404)...` blocks of the Node code.
 */
@Component
@RequiredArgsConstructor
public class Finder {

    private final UserRepository users;
    private final ClubRepository clubs;
    private final EventRepository events;
    private final TeamRepository teams;
    private final ScheduleRepository schedules;
    private final MatchRepository matches;
    private final StageRepository stages;

    public User user(String id) {
        return users.findById(require(id, "User id")).orElseThrow(() -> ApiException.notFound("User not found"));
    }

    public Club club(String id) {
        return clubs.findById(require(id, "Club id")).orElseThrow(() -> ApiException.notFound("Club not found"));
    }

    public Event event(String id) {
        return events.findById(require(id, "Event id")).orElseThrow(() -> ApiException.notFound("Event not found"));
    }

    public Team team(String id) {
        return teams.findById(require(id, "Team id")).orElseThrow(() -> ApiException.notFound("Team not found"));
    }

    public Schedule schedule(String id) {
        return schedules.findById(require(id, "Schedule id")).orElseThrow(() -> ApiException.notFound("Schedule not found"));
    }

    public Match match(String id) {
        return matches.findById(require(id, "Match id")).orElseThrow(() -> ApiException.notFound("Match not found"));
    }

    public Stage stage(String id) {
        return stages.findById(require(id, "Stage id")).orElseThrow(() -> ApiException.notFound("Stage not found"));
    }

    private static String require(String id, String label) {
        if (id == null || id.isBlank()) throw ApiException.badRequest(label + " is required");
        return id;
    }
}
