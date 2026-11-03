package com.venture.sports.schedule;

import com.venture.sports.common.BaseEntity;
import com.venture.sports.event.Event;
import com.venture.sports.match.Match;
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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** A match day / session of an event: when and where a group of matches is played. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "schedules")
public class Schedule extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String title;

    private LocalDate date;

    /** Free text such as "4:00 PM" (the frontend sends it that way). */
    @Column(length = 30)
    private String time;

    @Column(length = 300)
    private String location;

    @Column(length = 2000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    @OneToMany(mappedBy = "schedule")
    @OrderBy("slotIndex ASC")
    private List<Match> matches = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "schedule_qualified_teams",
            joinColumns = @JoinColumn(name = "schedule_id"),
            inverseJoinColumns = @JoinColumn(name = "team_id"))
    private Set<Team> qualifiedTeams = new LinkedHashSet<>();
}
