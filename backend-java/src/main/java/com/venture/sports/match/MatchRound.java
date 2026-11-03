package com.venture.sports.match;

import com.venture.sports.common.BaseEntity;
import com.venture.sports.team.Team;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One round/set/game inside a match, with its own score. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "match_rounds")
public class MatchRound extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id")
    private Match match;

    @Column(nullable = false)
    private int roundNo;

    private int teamAScore;

    private int teamBScore;

    /** null while playing, or when the round was a draw. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private Team winner;

    private boolean completed;

    public MatchRound(Match match, int roundNo) {
        this.match = match;
        this.roundNo = roundNo;
    }
}
