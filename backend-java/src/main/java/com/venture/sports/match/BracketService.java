package com.venture.sports.match;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.Event;
import com.venture.sports.event.EventService;
import com.venture.sports.team.Team;
import com.venture.sports.team.TeamRepository;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.Views.StageView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Builds a single-elimination (knockout) bracket.
 *
 * Example with 5 teams:
 *   bracket size  = next power of two = 8
 *   round-1 games = 5 - 8/2 = 1     (2 teams play)
 *   byes          = 8 - 5   = 3     (3 teams skip round 1)
 *
 *   Quarter Final: [T1 vs T2] [T3 bye] [T4 bye] [T5 bye]   -> 4 slots
 *   Semi Final:    [W(QF1) vs T3]      [T4 vs T5]
 *   Final:         [W(SF1) vs W(SF2)]
 *
 * Every slot of round N feeds slot N/2 of round N+1 (even slot -> teamA, odd slot -> teamB).
 * All of it runs in one transaction: either the whole bracket is saved or nothing is.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BracketService {

    private final StageRepository stages;
    private final MatchRepository matches;
    private final TeamRepository teams;
    private final Finder finder;
    private final ViewMapper mapper;
    private final Random random = new SecureRandom();

    @Transactional
    public Map<String, Object> generate(String eventId, String userId) {
        Event event = finder.event(eventId);
        EventService.requireStaff(event, userId);
        if (stages.existsByEventId(eventId)) throw ApiException.badRequest("Schedule already exists");

        List<Team> entrants = new ArrayList<>(teams.findByEventIdAndRegisteredTrueOrderByCreatedAtAsc(eventId));
        if (entrants.size() < 2) throw ApiException.badRequest("At least 2 registered teams required");

        // Fisher-Yates shuffle (unbiased, unlike sort(() => Math.random() - 0.5))
        Collections.shuffle(entrants, random);

        int totalTeams = entrants.size();
        int bracketSize = nextPowerOfTwo(totalTeams);
        int firstRoundMatches = totalTeams - bracketSize / 2;
        int byeCount = bracketSize - totalTeams;

        // 1. One stage per round: e.g. Quarter Final (8) -> Semi Final (4) -> Final (2)
        List<Stage> rounds = new ArrayList<>();
        int order = 1;
        for (int size = bracketSize; size >= 2; size /= 2) {
            Stage stage = new Stage();
            stage.setEvent(event);
            stage.setName(roundName(size));
            stage.setType("KNOCKOUT");
            stage.setStageOrder(order++);
            rounds.add(stages.save(stage));
        }

        // 2. Round 1: real matches first, then byes
        List<Match> previous = new ArrayList<>();
        int teamIndex = 0;
        for (int slot = 0; slot < bracketSize / 2; slot++) {
            Match m = newMatch(event, rounds.get(0), slot);
            if (slot < firstRoundMatches) {
                m.setTeamA(new MatchSide(entrants.get(teamIndex++), false));
                m.setTeamB(new MatchSide(entrants.get(teamIndex++), false));
            } else {
                Team byeTeam = entrants.get(teamIndex++);
                m.setTeamA(new MatchSide(byeTeam, true));
                m.setTeamB(new MatchSide(null, false));
                m.setStatus(MatchStatus.FINISHED);
                m.setWinner(byeTeam);
            }
            previous.add(matches.save(m));
        }
        rounds.get(0).getMatches().addAll(previous);
        rounds.get(0).getTeams().addAll(entrants);

        // 3. Later rounds: pair up the previous round's matches
        for (int r = 1; r < rounds.size(); r++) {
            Stage stage = rounds.get(r);
            List<Match> current = new ArrayList<>();
            for (int i = 0; i < previous.size(); i += 2) {
                Match next = matches.save(newMatch(event, stage, i / 2));
                link(previous.get(i), next, "teamA");
                link(previous.get(i + 1), next, "teamB");
                current.add(next);
            }
            stage.getMatches().addAll(current);
            previous = current;
        }

        log.info("Bracket for event {}: {} teams, size {}, {} byes", eventId, totalTeams, bracketSize, byeCount);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "Schedule created successfully");
        body.put("totalTeams", totalTeams);
        body.put("bracketSize", bracketSize);
        body.put("byeCount", byeCount);
        body.put("firstRoundMatches", firstRoundMatches);
        body.put("teamsPlayingRound1", firstRoundMatches * 2);
        body.put("stages", rounds.size());
        return body;
    }

    /**
     * Locking freezes the first-round pairings so matches can start.
     * (Later rounds are filled by winners, so only round 1 needs both teams.)
     */
    @Transactional
    public Map<String, Object> lock(String eventId, String userId) {
        Event event = finder.event(eventId);
        if (!event.isAdmin(userId)) throw ApiException.forbidden("Only admin can lock schedule");

        List<Stage> eventStages = stages.findByEventIdOrderByStageOrderAsc(eventId);
        if (eventStages.isEmpty()) throw ApiException.badRequest("Cannot lock schedule before generation");
        if (event.isScheduleLocked()) throw ApiException.badRequest("Schedule is already locked");

        boolean firstRoundReady = eventStages.get(0).getMatches().stream()
                .allMatch(m -> m.hasBothTeams() || (m.isBye() && m.getWinner() != null));
        if (!firstRoundReady) {
            throw ApiException.badRequest("All first-round matches must have teams before locking schedule");
        }

        event.setScheduleLocked(true);
        return Map.of("message", "Schedule locked successfully", "eventId", eventId);
    }

    @Transactional(readOnly = true)
    public List<StageView> stagesOf(String eventId) {
        return stages.findByEventIdOrderByStageOrderAsc(eventId).stream().map(mapper::stage).toList();
    }

    /** The winner of the Final, or null while the tournament is still running. */
    @Transactional(readOnly = true)
    public Map<String, Object> winner(String eventId) {
        Map<String, Object> body = new LinkedHashMap<>();
        Object winner = stages.findFirstByEventIdAndName(eventId, "Final")
                .flatMap(s -> s.getMatches().stream().findFirst())
                .map(Match::getWinner)
                .map(mapper::teamName)
                .orElse(null);
        body.put("winner", winner);
        return body;
    }

    private Match newMatch(Event event, Stage stage, int slot) {
        Match m = new Match();
        m.setEvent(event);
        m.setStage(stage);
        m.setMatchType(Match.TYPE_KNOCKOUT);
        m.setSlotIndex(slot);
        return m;
    }

    /** Point `from` at `to`; if `from` is a bye that already has a winner, move it forward now. */
    private void link(Match from, Match to, String slot) {
        from.setNextMatch(to);
        from.setNextSlot(slot);
        if (from.getWinner() != null) {
            MatchSide side = new MatchSide(from.getWinner(), true);
            if ("teamA".equals(slot)) to.setTeamA(side);
            else to.setTeamB(side);
        }
    }

    static int nextPowerOfTwo(int n) {
        int p = 1;
        while (p < n) p *= 2;
        return p;
    }

    static String roundName(int teamsInRound) {
        return switch (teamsInRound) {
            case 2 -> "Final";
            case 4 -> "Semi Final";
            case 8 -> "Quarter Final";
            default -> "Round of " + teamsInRound;
        };
    }
}
