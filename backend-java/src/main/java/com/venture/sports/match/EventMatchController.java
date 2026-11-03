package com.venture.sports.match;

import com.venture.sports.security.AuthUser;
import com.venture.sports.web.Views.MatchView;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Live match control: /events/matches/{matchId}/... (used by MatchControl.jsx and LiveMatchView.jsx). */
@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventMatchController {

    private final LiveMatchService liveMatchService;

    public record TeamsRequest(String teamA, String teamB) {
    }

    public record StatusRequest(String status) {
    }

    public record ResultRequest(String winnerTeamId) {
    }

    public record ScoreRequest(String team, Integer points) {
    }

    @GetMapping("/matches/{matchId}")
    public MatchView get(@PathVariable String matchId) {
        return liveMatchService.get(matchId);
    }

    @PutMapping("/matches/{matchId}/teams")
    public Map<String, String> setTeams(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId,
                                        @RequestBody TeamsRequest req) {
        liveMatchService.setTeams(matchId, req.teamA(), req.teamB(), me.id());
        return Map.of("message", "Match teams updated");
    }

    /** Older route: requires the bracket to be locked first. */
    @PutMapping("/{matchId}/status")
    public Map<String, String> goLiveLocked(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId,
                                            @RequestBody StatusRequest req) {
        liveMatchService.goLiveRequiringLock(matchId, req.status(), me.id());
        return Map.of("message", "Match started", "matchId", matchId);
    }

    @PutMapping("/matches/{matchId}/status")
    public Map<String, String> goLive(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId,
                                      @RequestBody StatusRequest req) {
        liveMatchService.goLive(matchId, req.status(), me.id());
        return Map.of("message", "Match started");
    }

    @PostMapping("/matches/{matchId}/start")
    public Map<String, String> start(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId) {
        liveMatchService.start(matchId, me.id());
        return Map.of("message", "Match started");
    }

    @PutMapping("/matches/{matchId}/round/score")
    public Map<String, Object> score(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId,
                                     @RequestBody ScoreRequest req) {
        return liveMatchService.updateRoundScore(matchId, req.team(), req.points(), me.id());
    }

    @PostMapping("/matches/{matchId}/round/end")
    public Map<String, Object> endRound(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId) {
        return liveMatchService.endRound(matchId, me.id());
    }

    @PostMapping("/matches/{matchId}/end")
    public Map<String, Object> end(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId) {
        return liveMatchService.endMatch(matchId, me.id());
    }

    @PutMapping("/{matchId}/result")
    public Map<String, Object> overrideResult(@AuthenticationPrincipal AuthUser me, @PathVariable String matchId,
                                              @RequestBody ResultRequest req) {
        return liveMatchService.overrideResult(matchId, req.winnerTeamId(), me.id());
    }
}
