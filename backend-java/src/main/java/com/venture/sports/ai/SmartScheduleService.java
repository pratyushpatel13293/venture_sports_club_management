package com.venture.sports.ai;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.EventService;
import com.venture.sports.match.Match;
import com.venture.sports.match.MatchRepository;
import com.venture.sports.match.MatchStatus;
import com.venture.sports.match.ScheduleMatchService;
import com.venture.sports.schedule.Schedule;
import com.venture.sports.team.Team;
import com.venture.sports.team.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Suggests fair pairings: sort the free teams by win rate and pair neighbours,
 * so teams of similar strength meet. Each pairing gets a 75-minute slot from the schedule's start time.
 * (A greedy algorithm - simple and good enough here, not a global optimum.)
 */
@Service
@RequiredArgsConstructor
public class SmartScheduleService {

    private static final Pattern TIME = Pattern.compile("(\\d{1,2}):(\\d{2})\\s*(AM|PM)", Pattern.CASE_INSENSITIVE);
    private static final int SLOT_MINUTES = 75;

    private final TeamRepository teams;
    private final MatchRepository matches;
    private final ScheduleMatchService scheduleMatchService;
    private final Finder finder;

    public record Pairing(String teamAId, String teamBId, Integer slotIndex) {
    }

    @Transactional(readOnly = true)
    public Map<String, Object> suggest(String scheduleId) {
        Schedule schedule = finder.schedule(scheduleId);
        String eventId = schedule.getEvent().getId();

        List<Team> registered = teams.findByEventIdAndRegisteredTrueOrderByCreatedAtAsc(eventId);
        Set<String> used = scheduleMatchService.usedTeamIds(scheduleId);
        List<Team> available = registered.stream().filter(t -> !used.contains(t.getId())).toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("scheduleId", scheduleId);
        body.put("availableTeamsCount", available.size());
        if (available.size() < 2) {
            body.put("recommendations", List.of());
            body.put("message", "Not enough available teams to suggest pairings (minimum 2 required).");
            return body;
        }

        List<Match> finished = matches.findByEventIdAndStatus(eventId, MatchStatus.FINISHED);
        Map<String, Double> winRate = new HashMap<>();
        for (Team t : registered) {
            List<Match> played = finished.stream().filter(m -> m.involves(t.getId()) && m.hasBothTeams()).toList();
            long wins = played.stream().filter(m -> m.getWinner() != null && m.getWinner().getId().equals(t.getId())).count();
            winRate.put(t.getId(), played.isEmpty() ? 0.5 : (double) wins / played.size());
        }

        List<Team> sorted = new ArrayList<>(available);
        sorted.sort(Comparator.comparingDouble(t -> winRate.getOrDefault(t.getId(), 0.5)));

        int[] start = parseStart(schedule.getTime());
        int slotIndex = (int) matches.countByScheduleId(scheduleId) + 1;
        List<Map<String, Object>> recommendations = new ArrayList<>();
        for (int i = 0; i + 1 < sorted.size(); i += 2) {
            Team a = sorted.get(i);
            Team b = sorted.get(i + 1);
            double diff = Math.abs(winRate.get(a.getId()) - winRate.get(b.getId()));
            String competitiveness = diff > 0.3 ? "Low" : diff > 0.15 ? "Moderate" : "High";

            Map<String, Object> rec = new LinkedHashMap<>();
            rec.put("teamA", Map.of("_id", a.getId(), "teamname", a.getTeamname()));
            rec.put("teamB", Map.of("_id", b.getId(), "teamname", b.getTeamname()));
            rec.put("slotIndex", slotIndex++);
            rec.put("recommendedTime", formatTime(start[0], start[1] + recommendations.size() * SLOT_MINUTES));
            rec.put("competitiveness", competitiveness);
            rec.put("reason", "Pairing based on similar win rates (difference " + Math.round(diff * 100) + "%).");
            recommendations.add(rec);
        }
        body.put("recommendations", recommendations);
        return body;
    }

    @Transactional
    public Map<String, Object> apply(String scheduleId, List<Pairing> pairings, String actorId) {
        Schedule schedule = finder.schedule(scheduleId);
        EventService.requireStaff(schedule.getEvent(), actorId);
        if (pairings == null || pairings.isEmpty()) throw ApiException.badRequest("Invalid or empty pairings provided.");

        for (Pairing p : pairings) {
            scheduleMatchService.buildMatch(schedule, p.teamAId(), p.teamBId(), p.slotIndex(), schedule.getTitle());
        }
        return Map.of("message", "Successfully scheduled " + pairings.size() + " matches using AI recommendations.",
                "matchesCount", pairings.size());
    }

    /** "4:30 PM" -> {16, 30}; default 4:00 PM. */
    static int[] parseStart(String time) {
        if (time != null) {
            Matcher m = TIME.matcher(time);
            if (m.find()) {
                int hour = Integer.parseInt(m.group(1));
                int minute = Integer.parseInt(m.group(2));
                boolean pm = m.group(3).equalsIgnoreCase("PM");
                if (pm && hour < 12) hour += 12;
                if (!pm && hour == 12) hour = 0;
                return new int[]{hour, minute};
            }
        }
        return new int[]{16, 0};
    }

    static String formatTime(int baseHour, int minutesFromBaseHour) {
        int hour = (baseHour + minutesFromBaseHour / 60) % 24;
        int minute = minutesFromBaseHour % 60;
        int displayHour = hour % 12 == 0 ? 12 : hour % 12;
        return displayHour + ":" + String.format("%02d", minute) + (hour >= 12 ? " PM" : " AM");
    }
}
