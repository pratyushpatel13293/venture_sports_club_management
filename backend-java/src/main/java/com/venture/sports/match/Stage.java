package com.venture.sports.match;

import com.venture.sports.common.BaseEntity;
import com.venture.sports.event.Event;
import com.venture.sports.schedule.Schedule;
import com.venture.sports.team.Team;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** One round of a knockout bracket: "Quarter Final", "Semi Final", "Final"... */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "stages")
public class Stage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(nullable = false, length = 60)
    private String name;

    /** "KNOCKOUT" or "LEAGUE". */
    @Column(nullable = false, length = 10)
    private String type;

    /** 1 = first round. (Not called "order": that is a reserved word in SQL and JPQL.) */
    @Column(name = "stage_order", nullable = false)
    private int stageOrder;

    @ManyToMany
    @JoinTable(name = "stage_teams",
            joinColumns = @JoinColumn(name = "stage_id"),
            inverseJoinColumns = @JoinColumn(name = "team_id"))
    private Set<Team> teams = new LinkedHashSet<>();

    @OneToMany(mappedBy = "stage")
    @OrderBy("slotIndex ASC")
    private List<Match> matches = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    private Schedule schedule;

    /** "pending", "ongoing" or "completed". */
    @Column(nullable = false, length = 10)
    private String status = "pending";
}
