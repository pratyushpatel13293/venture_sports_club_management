package com.venture.sports.match;

import com.venture.sports.common.ApiException;
import com.venture.sports.team.Team;
import org.springframework.stereotype.Component;

/**
 * The state machine shared by every "start / finish a match" endpoint.
 *
 *   UPCOMING ──start()──> LIVE ──finish(winner)──> FINISHED
 *                                     │
 *                                     └─> advanceWinner(): copy the winner into the next bracket match
 *
 * Keeping these rules in one class means the old /match/* routes and the new /events/matches/*
 * routes can't drift apart (in the Node code each route had its own copy of the logic).
 */
@Component
public class MatchEngine {

    public void start(Match match) {
        if (match.getStatus() != MatchStatus.UPCOMING) {
            throw ApiException.badRequest("Match already started or finished");
        }
        if (!match.hasBothTeams()) {
            throw ApiException.badRequest("Both teams must be decided before the match can start");
        }
        match.setStatus(MatchStatus.LIVE);
        if (match.getRounds().isEmpty()) {
            match.getRounds().add(new MatchRound(match, 1));
        }
        match.setCurrentRound(1);
    }

    public void finish(Match match, Team winner) {
        if (winner != null && !match.involves(winner.getId())) {
            throw ApiException.badRequest("Winner must be one of match teams");
        }
        match.setWinner(winner);
        match.setDraw(winner == null);
        match.setStatus(MatchStatus.FINISHED);
        if (winner != null) advanceWinner(match);
    }

    /** Knockout: the winner fills team A or team B of the next match. */
    public void advanceWinner(Match match) {
        Match next = match.getNextMatch();
        if (next == null || match.getWinner() == null) return;   // the final, or no winner yet

        MatchSide side = new MatchSide(match.getWinner(), true);
        if ("teamA".equals(match.getNextSlot())) {
            next.setTeamA(side);
        } else if ("teamB".equals(match.getNextSlot())) {
            next.setTeamB(side);
        }
    }

    /** Index of the next round = completed rounds + 1. */
    public int nextRoundNo(Match match) {
        return match.getRounds().stream().mapToInt(MatchRound::getRoundNo).max().orElse(0) + 1;
    }
}
