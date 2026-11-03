package com.venture.sports.match;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.Event;
import com.venture.sports.event.EventService;
import com.venture.sports.schedule.Schedule;
import com.venture.sports.team.Team;
import com.venture.sports.team.TeamRepository;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.ViewMapper.TeamDetail;
import com.venture.sports.web.Views.MatchView;
import com.venture.sports.web.Views.TeamName;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Matches that the admin creates by hand inside a schedule (a match day),
 * as opposed to the automatically generated knockout bracket.
 */
@Service
@RequiredArgsConstructor
public class ScheduleMatchService {

    private final MatchRepository matches;
    private final TeamRepository teams;
    private final MatchEngine engine;
    private final Finder finder;
    private final ViewMapper mapper;

    /** Registered teams that don't have a match in this schedule yet. */
    @Transactional(readOnly = true)
    public List<TeamName> availableTeams(String scheduleId) {
        Schedule schedule = finder.schedule(scheduleId);
        Set<String> used = usedTeamIds(scheduleId);
        return teams.findByEventIdAndRegisteredTrueOrderByCreatedAtAsc(schedule.getEvent().getId()).stream()
                .filter(t -> !used.contains(t.getId()))
                .map(mapper::teamName)
                .toList();
    }

    public Set<String> usedTeamIds(String scheduleId) {
        Set<String> used = new HashSet<>();
        for (Match m : matches.findByScheduleIdOrderBySlotIndexAsc(scheduleId)) {
            if (m.getTeamAEntity() != null) used.add(m.getTeamAEntity().getId());
            if (m.getTeamBEntity() != null) used.add(m.getTeamBEntity().getId());
        }
        return used;
    }

    @Transactional(readOnly = true)
    public List<MatchView> unfinishedOfEvent(String eventId) {
        return matches.findByEventIdAndStatusNotOrderByCreatedAtAsc(eventId, MatchStatus.FINISHED).stream()
                .map(m -> mapper.match(m, TeamDetail.NAME, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<MatchView> ofSchedule(String scheduleId) {
        return matches.findByScheduleIdOrderBySlotIndexAsc(scheduleId).stream()
                .map(m -> mapper.match(m, TeamDetail.NAME_AND_MEMBERS, false)).toList();
    }

    @Transactional(readOnly = true)
    public MatchView getFull(String matchId) {
        return mapper.match(finder.match(matchId), TeamDetail.FULL, true);
    }

    /**
     * Creates a match in a schedule (and optionally attaches it to a bracket stage).
     * slotIndex and matchType are optional: defaults are "next free slot" and the schedule title.
     */
    @Transactional
    public MatchView create(String eventId, String scheduleId, String stageId, String teamAId, String teamBId,
                            Integer slotIndex, String matchType, String actorId) {
        if (scheduleId == null || scheduleId.isBlank()) throw ApiException.badRequest("scheduleid is required");
        Schedule schedule = finder.schedule(scheduleId);
        Event event = schedule.getEvent();
        if (eventId != null && !eventId.isBlank() && !event.getId().equals(eventId)) {
            throw ApiException.badRequest("Schedule does not belong to this event");
        }
        EventService.requireStaff(event, actorId);

        Match match = buildMatch(schedule, teamAId, teamBId, slotIndex, matchType);
        if (stageId != null && !stageId.isBlank()) {
            Stage stage = finder.stage(stageId);
            if (!stage.getEvent().getId().equals(event.getId())) throw ApiException.badRequest("Stage not in event");
            match.setStage(stage);
            stage.getMatches().add(match);
        }
        return mapper.match(match, TeamDetail.NAME, false);
    }

    /** Shared with the AI smart scheduler. Validates teams and saves the match. */
    @Transactional
    public Match buildMatch(Schedule schedule, String teamAId, String teamBId, Integer slotIndex, String matchType) {
        if (teamAId == null || teamBId == null || teamAId.isBlank() || teamBId.isBlank()) {
            throw ApiException.badRequest("Select both teams");
        }
        if (teamAId.equals(teamBId)) throw ApiException.badRequest("A team can't play against itself");
        Event event = schedule.getEvent();
        Team a = finder.team(teamAId);
        Team b = finder.team(teamBId);
        if (!a.getEvent().getId().equals(event.getId()) || !b.getEvent().getId().equals(event.getId())) {
            throw ApiException.badRequest("Teams invalid for event");
        }
        Set<String> used = usedTeamIds(schedule.getId());
        if (used.contains(a.getId()) || used.contains(b.getId())) {
            throw ApiException.badRequest("A team already has a match in this schedule");
        }

        Match match = new Match();
        match.setEvent(event);
        match.setSchedule(schedule);
        match.setSlotIndex(slotIndex != null ? slotIndex : (int) matches.countByScheduleId(schedule.getId()) + 1);
        match.setMatchType(matchType == null || matchType.isBlank() ? schedule.getTitle() : matchType);
        match.setTeamA(new MatchSide(a, false));
        match.setTeamB(new MatchSide(b, false));
        matches.save(match);
        schedule.getMatches().add(match);
        return match;
    }

    // ----- older single-round routes kept for API compatibility (/match/{id}/start|score|finish) -----

    @Transactional
    public void start(String matchId, String actorId) {
        Match match = finder.match(matchId);
        EventService.requireStaff(match.getEvent(), actorId);
        engine.start(match);
    }

    @Transactional
    public void setScore(String matchId, Integer teamAScore, Integer teamBScore, String actorId) {
        Match match = finder.match(matchId);
        EventService.requireStaff(match.getEvent(), actorId);
        if (match.getStatus() != MatchStatus.LIVE) throw ApiException.badRequest("Match is not live");
        if (match.getRounds().isEmpty()) match.getRounds().add(new MatchRound(match, 1));
        MatchRound first = match.getRounds().get(0);
        if (teamAScore != null) first.setTeamAScore(Math.max(0, teamAScore));
        if (teamBScore != null) first.setTeamBScore(Math.max(0, teamBScore));
    }

    @Transactional
    public Map<String, Object> finish(String matchId, String actorId) {
        Match match = finder.match(matchId);
        EventService.requireStaff(match.getEvent(), actorId);
        if (match.getStatus() == MatchStatus.FINISHED) throw ApiException.badRequest("Match already ended");
        MatchRound first = match.getRounds().isEmpty() ? null : match.getRounds().get(0);
        int a = first == null ? 0 : first.getTeamAScore();
        int b = first == null ? 0 : first.getTeamBScore();
        Team winner = a > b ? match.getTeamAEntity() : b > a ? match.getTeamBEntity() : null;
        if (first != null) {
            first.setWinner(winner);
            first.setCompleted(true);
        }
        engine.finish(match, winner);

        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("message", "Match finished");
        body.put("winner", winner == null ? null : winner.getId());
        return body;
    }

    @Transactional
    public void delete(String matchId, String actorId) {
        Match match = finder.match(matchId);
        EventService.requireStaff(match.getEvent(), actorId);
        if (match.getStage() != null) throw ApiException.badRequest("Bracket matches can't be deleted");
        if (match.getStatus() == MatchStatus.LIVE) throw ApiException.badRequest("A live match can't be deleted");
        if (match.getSchedule() != null) match.getSchedule().getMatches().remove(match);
        matches.delete(match);
    }
}
