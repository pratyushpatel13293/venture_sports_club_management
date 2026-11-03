package com.venture.sports.ai;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.match.Match;
import com.venture.sports.match.MatchRound;
import com.venture.sports.match.MatchStatus;
import com.venture.sports.team.Team;
import com.venture.sports.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Post-match summary for a finished match.
 * The round score line (e.g. 2-1) is real; the MVP and the MVP's kills/deaths/assists are
 * SIMULATED (the platform doesn't track individual player stats).
 */
@Service
@RequiredArgsConstructor
public class HighlightsService {

    private final GeminiClient gemini;
    private final Finder finder;

    @Transactional(readOnly = true)
    public Map<String, Object> highlights(String matchId) {
        Match match = finder.match(matchId);
        if (match.getStatus() != MatchStatus.FINISHED || match.getWinner() == null) {
            throw ApiException.badRequest("Match has not finished yet.");
        }
        if (!match.hasBothTeams()) throw ApiException.badRequest("Highlights are not available for a bye.");

        Team winner = match.getWinner();
        Team loser = winner.getId().equals(match.getTeamAEntity().getId()) ? match.getTeamBEntity() : match.getTeamAEntity();

        int winnerRounds = 0;
        int loserRounds = 0;
        for (MatchRound r : match.getRounds()) {
            if (r.getWinner() == null) continue;
            if (r.getWinner().getId().equals(winner.getId())) winnerRounds++;
            else loserRounds++;
        }
        String scoreLine = winnerRounds + "-" + loserRounds;

        List<User> roster = new ArrayList<>(winner.getMembers());
        String mvpName = "Team effort";
        if (!roster.isEmpty()) {
            int index = Math.floorMod(matchId.chars().sum(), roster.size());
            User mvp = roster.get(index);
            mvpName = mvp.getUsername() != null ? mvp.getUsername() : mvp.getName();
        }
        int kills = (int) DeterministicStats.value(matchId, mvpName + "kills", 14, 25, 0);
        int deaths = (int) DeterministicStats.value(matchId, mvpName + "deaths", 3, 9, 0);
        int assists = (int) DeterministicStats.value(matchId, mvpName + "assists", 4, 15, 0);

        String keyTurningPoint = winner.getTeamname() + " took control in the decisive round and never let "
                + loser.getTeamname() + " back into the match.";

        String finalMvp = mvpName;
        String summary = gemini.generate(String.format(
                        "Act as a sports reporter. In under 60 words, summarise a match where %s beat %s %s (rounds). "
                                + "Player of the match: %s.", winner.getTeamname(), loser.getTeamname(), scoreLine, mvpName))
                .orElse(winner.getTeamname() + " beat " + loser.getTeamname() + " " + scoreLine
                        + " in a hard-fought match. " + finalMvp + " was the difference-maker.");

        String socialPost = "🔥 " + winner.getTeamname() + " takes it " + scoreLine + " against " + loser.getTeamname()
                + "! Player of the match: " + mvpName + " 🏆 #Venture";

        Map<String, Object> mvp = new LinkedHashMap<>();
        mvp.put("name", mvpName);
        mvp.put("kills", kills);
        mvp.put("deaths", deaths);
        mvp.put("assists", assists);
        mvp.put("kdRatio", Math.round(100.0 * kills / Math.max(1, deaths)) / 100.0);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("matchId", matchId);
        body.put("winner", winner.getTeamname());
        body.put("loser", loser.getTeamname());
        body.put("scoreLine", scoreLine);
        body.put("mvp", mvp);
        body.put("summary", summary);
        body.put("keyTurningPoint", keyTurningPoint);
        body.put("socialPost", socialPost);
        body.put("winnerRoster", winner.getMembers().stream().map(User::getUsername).toList());
        body.put("loserRoster", loser.getMembers().stream().map(User::getUsername).toList());
        return body;
    }
}
