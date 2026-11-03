package com.venture.sports.match;

import com.venture.sports.common.BaseEntity;
import com.venture.sports.event.Event;
import com.venture.sports.schedule.Schedule;
import com.venture.sports.team.Team;
import jakarta.persistence.AssociationOverride;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * A single game between team A and team B.
 *
 * Knockout brackets are a linked structure: each match points to the match its winner
 * plays next (nextMatch) and which side it fills there (nextSlot = "teamA" / "teamB").
 *
 *   QF1 ─┐
 *        ├─> SF1 ─┐
 *   QF2 ─┘        ├─> Final
 *   QF3 ─┐        │
 *        ├─> SF2 ─┘
 *   QF4 ─┘
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "matches", indexes = {
        @Index(name = "idx_match_event", columnList = "event_id"),
        @Index(name = "idx_match_schedule", columnList = "schedule_id"),
        @Index(name = "idx_match_stage", columnList = "stage_id")
})
public class Match extends BaseEntity {

    public static final String TYPE_KNOCKOUT = "KNOCKOUT";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    /** Set for matches created manually inside a schedule. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    private Schedule schedule;

    /** Set for matches generated as part of a knockout bracket. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private Stage stage;

    private int slotIndex;

    @Column(nullable = false, length = 100)
    private String matchType;

    @Convert(converter = MatchStatusConverter.class)
    @Column(nullable = false, length = 10)
    private MatchStatus status = MatchStatus.UPCOMING;

    @Embedded
    @AttributeOverride(name = "autoAdvanced", column = @Column(name = "team_a_auto_advanced"))
    @AssociationOverride(name = "team", joinColumns = @JoinColumn(name = "team_a_id"))
    private MatchSide teamA = new MatchSide();

    @Embedded
    @AttributeOverride(name = "autoAdvanced", column = @Column(name = "team_b_auto_advanced"))
    @AssociationOverride(name = "team", joinColumns = @JoinColumn(name = "team_b_id"))
    private MatchSide teamB = new MatchSide();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "next_match_id")
    private Match nextMatch;

    /** "teamA" or "teamB": which side of nextMatch our winner fills. */
    @Column(length = 5)
    private String nextSlot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private Team winner;

    private boolean draw;

    /** "NORMAL" or "PENALTY". */
    @Column(length = 10)
    private String decidedBy = "NORMAL";

    private int currentRound = 1;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("roundNo ASC")
    private List<MatchRound> rounds = new ArrayList<>();

    /**
     * Optimistic locking. If two managers update the same match at the same moment,
     * the second save fails instead of silently overwriting the first one.
     */
    @Version
    private long version;

    public Team getTeamAEntity() {
        return teamA == null ? null : teamA.getTeam();
    }

    public Team getTeamBEntity() {
        return teamB == null ? null : teamB.getTeam();
    }

    public boolean hasBothTeams() {
        return getTeamAEntity() != null && getTeamBEntity() != null;
    }

    /** A bye: exactly one team, so it auto-advances without playing. */
    public boolean isBye() {
        return (getTeamAEntity() == null) != (getTeamBEntity() == null);
    }

    public Optional<MatchRound> activeRound() {
        return rounds.stream().filter(r -> !r.isCompleted()).findFirst();
    }

    public boolean involves(String teamId) {
        return (getTeamAEntity() != null && getTeamAEntity().getId().equals(teamId))
                || (getTeamBEntity() != null && getTeamBEntity().getId().equals(teamId));
    }
}
