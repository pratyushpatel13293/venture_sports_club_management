package com.venture.sports.ai;

import com.venture.sports.common.Finder;
import com.venture.sports.match.Match;
import com.venture.sports.match.MatchRepository;
import com.venture.sports.match.MatchStatus;
import com.venture.sports.team.Team;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * "Who will win?" for an upcoming match, computed from finished matches of the same event.
 *
 * Score per team (0-100 each factor):
 *   35% win rate + 25% recent form (last 5) + 20% head-to-head + 10% win streak + 10% event performance
 * probabilityA = scoreA / (scoreA + scoreB), clamped to 15..85 %.
 *
 * Only win rate, form, streak and head-to-head come from real results.
 * K/D, rank and bonus are simulated (see DeterministicStats).
 */
@Service
@RequiredArgsConstructor
public class PredictionService {

    private final MatchRepository matches;
    private final GeminiClient gemini;
    private final Finder finder;

    private record TeamStats(int total, int wins, int winRate, int form, List<String> lastFive,
                             double kd, int rank, int bonus, int streakCount, String streakType) {
    }

    @Transactional(readOnly = true)
    public Map<String, Object> predict(String matchId) {
        Match match = finder.match(matchId);
        Team teamA = match.getTeamAEntity();
        Team teamB = match.getTeamBEntity();

        if (teamA == null || teamB == null) return waitingForTeams(teamA, teamB);

        List<Match> finished = matches.findByEventIdAndStatus(match.getEvent().getId(), MatchStatus.FINISHED);
        TeamStats a = stats(teamA, finished);
        TeamStats b = stats(teamB, finished);

        List<Match> h2h = finished.stream().filter(m -> m.involves(teamA.getId()) && m.involves(teamB.getId())).toList();
        int h2hA = (int) h2h.stream().filter(m -> wonBy(m, teamA)).count();
        int h2hB = (int) h2h.stream().filter(m -> wonBy(m, teamB)).count();
        int totalH2h = h2hA + h2hB;
        int h2hScoreA = totalH2h > 0 ? Math.round(100f * h2hA / totalH2h) : 50;
        int h2hScoreB = totalH2h > 0 ? Math.round(100f * h2hB / totalH2h) : 50;

        double rawA = a.winRate() * 0.35 + a.form() * 0.25 + h2hScoreA * 0.20 + streakScore(a) * 0.10 + a.winRate() * 0.10;
        double rawB = b.winRate() * 0.35 + b.form() * 0.25 + h2hScoreB * 0.20 + streakScore(b) * 0.10 + b.winRate() * 0.10;

        int probA = 50;
        if (rawA + rawB > 0) probA = Math.max(15, Math.min(85, (int) Math.round(100 * rawA / (rawA + rawB))));
        int probB = 100 - probA;

        int sample = a.total() + b.total();
        int confidenceValue = Math.min(96, Math.max(50, 70 + (int) (Math.abs(probA - probB) * 0.3) + Math.min(15, sample * 2)));
        String confidence = confidenceValue >= 85 ? "High" : confidenceValue < 65 ? "Low" : "Medium";

        boolean aFavoured = probA > probB;
        TeamStats fav = aFavoured ? a : b;
        TeamStats under = aFavoured ? b : a;

        List<String> reasons = new ArrayList<>();
        if (fav.form() > under.form()) reasons.add("Better recent form");
        if (aFavoured ? h2hA > h2hB : h2hB > h2hA) {
            reasons.add("Won last " + (aFavoured ? h2hA : h2hB) + " head-to-head encounters");
        } else if (totalH2h == 0) {
            reasons.add("No prior head-to-head records; analysis relies heavily on individual team history");
        }
        if (fav.winRate() > under.winRate()) reasons.add(fav.winRate() + "% historical tournament win rate");
        if ("W".equals(fav.streakType()) && fav.streakCount() >= 2) {
            reasons.add("On an active " + fav.streakCount() + "-match winning streak");
        }
        if (reasons.isEmpty()) reasons.add("Statistically balanced match-up");

        List<Map<String, String>> keyFactors = new ArrayList<>();
        int wrDiff = Math.abs(a.winRate() - b.winRate());
        if (wrDiff > 0) keyFactors.add(factor("Better Win Rate (+" + wrDiff + "%)", a.winRate() > b.winRate()));
        if (h2hA != h2hB) keyFactors.add(factor("Better Head-to-Head (+" + Math.abs(h2hA - h2hB) + " wins)", h2hA > h2hB));
        if ("W".equals(a.streakType()) && !"W".equals(b.streakType())) {
            keyFactors.add(factor("Active Win Streak (+" + a.streakCount() + " games)", true));
        } else if ("W".equals(b.streakType()) && !"W".equals(a.streakType())) {
            keyFactors.add(factor("Active Win Streak (+" + b.streakCount() + " games)", false));
        }
        int formDiff = Math.abs(a.form() - b.form());
        if (formDiff > 0) keyFactors.add(factor("Superior Recent Form (+" + formDiff + "%)", a.form() > b.form()));
        if (keyFactors.isEmpty()) keyFactors.add(Map.of("text", "Equal Form & Rating", "advantage", "neutral"));

        int offset = (int) DeterministicStats.value(teamA.getId(), "movement", -6, 8, 0);
        int movement = offset == 0 ? 3 : offset;

        String favName = aFavoured ? teamA.getTeamname() : teamB.getTeamname();
        String commentary = gemini.generate(String.format(
                "Act as a sports analyst. In under 60 words, preview the match %s vs %s. "
                        + "%s: win rate %d%%, form %d%%. %s: win rate %d%%, form %d%%. Head-to-head %d-%d. "
                        + "Predicted win chance: %s %d%%, %s %d%%. No placeholders.",
                teamA.getTeamname(), teamB.getTeamname(),
                teamA.getTeamname(), a.winRate(), a.form(), teamB.getTeamname(), b.winRate(), b.form(),
                h2hA, h2hB, teamA.getTeamname(), probA, teamB.getTeamname(), probB))
                .orElse(favName + " goes in as the favourite with a " + Math.max(probA, probB)
                        + "% win probability, backed by " + fav.form() + "% recent form. "
                        + (aFavoured ? teamB.getTeamname() : teamA.getTeamname())
                        + " can still cause an upset if they start strong.");

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("winsA", a.wins());
        stats.put("winsB", b.wins());
        stats.put("kdA", a.kd());
        stats.put("kdB", b.kd());
        stats.put("rankA", a.rank());
        stats.put("rankB", b.rank());
        stats.put("h2hA", h2hA);
        stats.put("h2hB", h2hB);
        stats.put("bonusA", a.bonus());
        stats.put("bonusB", b.bonus());
        stats.put("formA", a.form());
        stats.put("formB", b.form());
        stats.put("winRateA", a.winRate());
        stats.put("winRateB", b.winRate());
        stats.put("streakA", a.lastFive());
        stats.put("streakB", b.lastFive());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("tbd", false);
        body.put("matchId", matchId);
        body.put("teamA", Map.of("id", teamA.getId(), "teamname", teamA.getTeamname()));
        body.put("teamB", Map.of("id", teamB.getId(), "teamname", teamB.getTeamname()));
        body.put("probabilityA", probA);
        body.put("probabilityB", probB);
        body.put("confidence", confidence);
        body.put("confidenceValue", confidenceValue);
        body.put("reasons", reasons);
        body.put("keyFactors", keyFactors);
        body.put("movement", movement);
        body.put("stats", stats);
        body.put("commentary", commentary);
        return body;
    }

    private TeamStats stats(Team team, List<Match> finished) {
        List<Match> played = finished.stream()
                .filter(m -> m.involves(team.getId()) && m.hasBothTeams())   // byes don't count
                .sorted(Comparator.comparing(Match::getUpdatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();
        int total = played.size();
        int wins = (int) played.stream().filter(m -> wonBy(m, team)).count();
        int winRate = total > 0 ? Math.round(100f * wins / total) : 50;

        List<Match> lastFiveMatches = played.subList(Math.max(0, total - 5), total);
        int formWins = (int) lastFiveMatches.stream().filter(m -> wonBy(m, team)).count();
        int form = lastFiveMatches.isEmpty() ? 50 : Math.round(100f * formWins / lastFiveMatches.size());
        List<String> lastFive = lastFiveMatches.stream().map(m -> wonBy(m, team) ? "W" : "L").toList();

        String streakType = null;
        int streakCount = 0;
        for (int i = total - 1; i >= 0; i--) {
            String type = wonBy(played.get(i), team) ? "W" : "L";
            if (streakType == null) {
                streakType = type;
                streakCount = 1;
            } else if (streakType.equals(type)) {
                streakCount++;
            } else {
                break;
            }
        }

        double kd = DeterministicStats.value(team.getId(), team.getTeamname(), 0.85, 1.80, 2);
        int rank = (int) DeterministicStats.value(team.getId(), team.getTeamname(), 1, 16, 0);
        int bonus = (int) DeterministicStats.value(team.getId(), team.getTeamname(), 1, 12, 0)
                + ("W".equals(streakType) ? streakCount * 2 : 0);

        return new TeamStats(total, wins, winRate, form, lastFive, kd, rank, bonus, streakCount, streakType);
    }

    private static int streakScore(TeamStats s) {
        return "W".equals(s.streakType()) ? Math.min(100, s.streakCount() * 25) : 10;
    }

    private static boolean wonBy(Match m, Team team) {
        return m.getWinner() != null && m.getWinner().getId().equals(team.getId());
    }

    private static Map<String, String> factor(String text, boolean teamAAdvantage) {
        return Map.of("text", text, "advantage", teamAAdvantage ? "teamA" : "teamB");
    }

    private static Map<String, Object> waitingForTeams(Team teamA, Team teamB) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("winsA", 0);
        stats.put("winsB", 0);
        stats.put("kdA", 1.0);
        stats.put("kdB", 1.0);
        stats.put("rankA", 0);
        stats.put("rankB", 0);
        stats.put("h2hA", 0);
        stats.put("h2hB", 0);
        stats.put("bonusA", 0);
        stats.put("bonusB", 0);
        stats.put("formA", 50);
        stats.put("formB", 50);
        stats.put("winRateA", 50);
        stats.put("winRateB", 50);
        stats.put("streakA", List.of());
        stats.put("streakB", List.of());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("tbd", true);
        body.put("teamA", Map.of("teamname", teamA == null ? "TBD" : teamA.getTeamname()));
        body.put("teamB", Map.of("teamname", teamB == null ? "TBD" : teamB.getTeamname()));
        body.put("probabilityA", 50);
        body.put("probabilityB", 50);
        body.put("confidence", "N/A");
        body.put("confidenceValue", 50);
        body.put("reasons", List.of("Waiting for both teams to be qualified and scheduled."));
        body.put("keyFactors", List.of());
        body.put("movement", 0);
        body.put("stats", stats);
        body.put("commentary", "Match prediction will become active once both opponents are decided.");
        return body;
    }
}
