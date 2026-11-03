package com.venture.sports.match;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.Event;
import com.venture.sports.event.EventService;
import com.venture.sports.realtime.RealtimePublisher;
import com.venture.sports.team.Team;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.ViewMapper.TeamDetail;
import com.venture.sports.web.Views.MatchView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Live scoring used by the Match Control Panel (/events/matches/...).
 *
 *  start ─> score updates (per round) ─> end round ─> ... ─> end match ─> winner moves on
 *
 * Every change is pushed to /topic/event/{eventId} so the Live Match View updates instantly.
 */
@Service
@RequiredArgsConstructor
public class LiveMatchService {

    private final MatchEngine engine;
    private final RealtimePublisher realtime;
    private final Finder finder;
    private final ViewMapper mapper;

    @Transactional(readOnly = true)
    public MatchView get(String matchId) {
        return mapper.match(finder.match(matchId), TeamDetail.NAME, false);
    }

    /** Admin/manager swaps the teams of an upcoming match (only before the schedule is locked). */
    @Transactional
    public void setTeams(String matchId, String teamAId, String teamBId, String userId) {
        if (teamAId == null || teamBId == null || teamAId.equals(teamBId)) {
            throw ApiException.badRequest("Invalid teams");
        }
        Match match = finder.match(matchId);
        if (match.getStatus() != MatchStatus.UPCOMING) throw ApiException.badRequest("Match already started");
        Event event = match.getEvent();
        if (event.isScheduleLocked()) throw ApiException.forbidden("Schedule locked");
        EventService.requireStaff(event, userId);

        Team a = finder.team(teamAId);
        Team b = finder.team(teamBId);
        if (!a.getEvent().getId().equals(event.getId()) || !b.getEvent().getId().equals(event.getId())) {
            throw ApiException.badRequest("Teams invalid for event");
        }
        match.setTeamA(new MatchSide(a, false));
        match.setTeamB(new MatchSide(b, false));
    }

    /** PUT /events/{matchId}/status - the older "go live" route that also requires a locked schedule. */
    @Transactional
    public void goLiveRequiringLock(String matchId, String status, String userId) {
        if (!"live".equals(status)) throw ApiException.badRequest("Only 'live' status is allowed here");
        Match match = finder.match(matchId);
        if (!match.getEvent().isScheduleLocked()) throw ApiException.forbidden("Lock schedule before starting matches");
        start(match, userId);
    }

    @Transactional
    public void goLive(String matchId, String status, String userId) {
        if (!"live".equals(status)) throw ApiException.badRequest("Invalid status");
        start(finder.match(matchId), userId);
    }

    @Transactional
    public void start(String matchId, String userId) {
        start(finder.match(matchId), userId);
    }

    private void start(Match match, String userId) {
        EventService.requireStaff(match.getEvent(), userId);
        engine.start(match);
        realtime.toEvent(match.getEvent().getId(), "match:started", Map.of("matchId", match.getId()));
    }

    /** Sets one team's score in the current round (creates the next round if none is open). */
    @Transactional
    public Map<String, Object> updateRoundScore(String matchId, String team, Integer points, String userId) {
        if (!"A".equals(team) && !"B".equals(team)) throw ApiException.badRequest("Invalid team");
        if (points == null || points < 0) throw ApiException.badRequest("Invalid score value");

        Match match = finder.match(matchId);
        if (match.getStatus() != MatchStatus.LIVE) throw ApiException.badRequest("Match is not live");
        EventService.requireStaff(match.getEvent(), userId);

        MatchRound round = match.activeRound().orElseGet(() -> {
            MatchRound r = new MatchRound(match, engine.nextRoundNo(match));
            match.getRounds().add(r);
            return r;
        });
        if ("A".equals(team)) round.setTeamAScore(points);
        else round.setTeamBScore(points);
        match.setCurrentRound(round.getRoundNo());

        Map<String, Object> update = new LinkedHashMap<>();
        update.put("matchId", match.getId());
        update.put("roundNo", round.getRoundNo());
        update.put("teamA_score", round.getTeamAScore());
        update.put("teamB_score", round.getTeamBScore());
        realtime.toEvent(match.getEvent().getId(), "match:round:update", update);

        Map<String, Object> body = new LinkedHashMap<>(update);
        body.remove("matchId");
        body.put("message", "Score updated");
        return body;
    }

    /** Closes the current round; the higher score wins it (equal = draw round). */
    @Transactional
    public Map<String, Object> endRound(String matchId, String userId) {
        Match match = finder.match(matchId);
        if (match.getStatus() != MatchStatus.LIVE) throw ApiException.badRequest("Match is not live");
        EventService.requireStaff(match.getEvent(), userId);

        MatchRound round = match.activeRound().orElseThrow(() -> ApiException.badRequest("No active round"));
        Team winner = null;
        if (round.getTeamAScore() > round.getTeamBScore()) winner = match.getTeamAEntity();
        else if (round.getTeamBScore() > round.getTeamAScore()) winner = match.getTeamBEntity();
        round.setWinner(winner);
        round.setCompleted(true);
        match.setCurrentRound(round.getRoundNo() + 1);

        Map<String, Object> payload = new HashMap<>();
        payload.put("matchId", match.getId());
        payload.put("roundNo", round.getRoundNo());
        payload.put("winner", winner == null ? null : winner.getId());
        realtime.toEvent(match.getEvent().getId(), "match:round:ended", payload);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "Round ended");
        body.put("roundNo", round.getRoundNo());
        body.put("winner", winner == null ? null : winner.getId());
        return body;
    }

    /** The team that won more rounds wins the match. A tie must be broken by another round. */
    @Transactional
    public Map<String, Object> endMatch(String matchId, String userId) {
        Match match = finder.match(matchId);
        if (match.getStatus() == MatchStatus.FINISHED) throw ApiException.badRequest("Match already ended");
        EventService.requireStaff(match.getEvent(), userId);
        if (match.activeRound().isPresent()) {
            throw ApiException.badRequest("End the current round before ending match");
        }

        Team winner = decideByRoundsWon(match);
        engine.finish(match, winner);

        realtime.toEvent(match.getEvent().getId(), "match:ended",
                Map.of("matchId", match.getId(), "winner", winner.getId()));
        return Map.of("message", "Match ended successfully", "winner", winner.getId());
    }

    /** Admin declares the winner directly (walk-over, dispute...). */
    @Transactional
    public Map<String, Object> overrideResult(String matchId, String winnerTeamId, String userId) {
        if (winnerTeamId == null || winnerTeamId.isBlank()) throw ApiException.badRequest("Winner team is required");
        Match match = finder.match(matchId);
        if (!match.getEvent().isAdmin(userId)) throw ApiException.forbidden("Only admin can override results");
        if (match.getWinner() != null) throw ApiException.badRequest("Winner already declared");
        if (!match.involves(winnerTeamId)) throw ApiException.badRequest("Winner must be one of match teams");

        engine.finish(match, finder.team(winnerTeamId));
        realtime.toEvent(match.getEvent().getId(), "match:ended",
                Map.of("matchId", match.getId(), "winner", winnerTeamId));
        return Map.of("message", "Winner overridden and progressed", "winnerTeamId", winnerTeamId);
    }

    private Team decideByRoundsWon(Match match) {
        Team a = match.getTeamAEntity();
        Team b = match.getTeamBEntity();
        List<MatchRound> done = match.getRounds().stream().filter(MatchRound::isCompleted).toList();
        long winsA = done.stream().filter(r -> r.getWinner() != null && a != null && r.getWinner().getId().equals(a.getId())).count();
        long winsB = done.stream().filter(r -> r.getWinner() != null && b != null && r.getWinner().getId().equals(b.getId())).count();
        if (winsA == winsB) {
            throw ApiException.badRequest("Winner could not be decided: rounds are tied. Play another round.");
        }
        return winsA > winsB ? a : b;
    }
}
