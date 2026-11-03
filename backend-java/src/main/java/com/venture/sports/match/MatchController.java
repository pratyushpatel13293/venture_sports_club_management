package com.venture.sports.match;

import com.venture.sports.security.AuthUser;
import com.venture.sports.web.Views.MatchView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Schedule matches: /match/... (used by schedule.jsx and EventMatches.jsx). */
@RestController
@RequestMapping("/match")
@RequiredArgsConstructor
public class MatchController {

    private final ScheduleMatchService service;

    public record CreateRequest(String eventid, String scheduleid, String teamA, String teamB,
                                Integer slotIndex, String matchType) {
    }

    public record ScoreRequest(Integer teamA_score, Integer teamB_score) {
    }

    @GetMapping("/available-teams/{scheduleId}")
    public Map<String, Object> availableTeams(@PathVariable String scheduleId) {
        return Map.of("teams", service.availableTeams(scheduleId));
    }

    @GetMapping("/all/{eventId}")
    public Map<String, Object> all(@PathVariable String eventId) {
        return Map.of("message", "all matches", "matches", service.unfinishedOfEvent(eventId));
    }

    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@AuthenticationPrincipal AuthUser me, @RequestBody CreateRequest req) {
        MatchView match = service.create(req.eventid(), req.scheduleid(), null, req.teamA(), req.teamB(),
                req.slotIndex(), req.matchType(), me.id());
        return Map.of("message", "Match created", "match", match);
    }

    @GetMapping("/schedule/{scheduleId}")
    public Map<String, Object> ofSchedule(@PathVariable String scheduleId) {
        return Map.of("matches", service.ofSchedule(scheduleId));
    }

    @GetMapping("/{matchId}")
    public MatchView get(@PathVariable String matchId) {
        return service.getFull(matchId);
    }

    @PutMapping("/{matchId}/start")
    public Map<String, String> start(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId) {
        service.start(matchId, me.id());
        return Map.of("message", "Match started");
    }

    @PutMapping("/{matchId}/score")
    public Map<String, String> score(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId,
                                     @RequestBody ScoreRequest req) {
        service.setScore(matchId, req.teamA_score(), req.teamB_score(), me.id());
        return Map.of("message", "Score updated");
    }

    @PutMapping("/{matchId}/finish")
    public Map<String, Object> finish(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId) {
        return service.finish(matchId, me.id());
    }

    @DeleteMapping("/{matchId}")
    public Map<String, String> delete(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId) {
        service.delete(matchId, me.id());
        return Map.of("message", "Match deleted");
    }
}
