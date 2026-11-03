package com.venture.sports.match;

import com.venture.sports.team.Team;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One side of a match (team A or team B).
 * @Embeddable = its columns are stored inside the matches table, not a separate table.
 * Match uses it twice with different column names (team_a_id / team_b_id).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class MatchSide {

    /** null = "TBD" (winner of an earlier match not known yet). */
    @ManyToOne(fetch = FetchType.LAZY)
    private Team team;

    /** true when the team arrived here automatically (a bye or a won previous match). */
    private boolean autoAdvanced;
}
