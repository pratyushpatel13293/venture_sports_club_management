package com.venture.sports.event;

import com.venture.sports.club.Club;
import com.venture.sports.common.BaseEntity;
import com.venture.sports.schedule.Schedule;
import com.venture.sports.team.Team;
import com.venture.sports.user.User;
import jakarta.persistence.CascadeType;
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

/**
 * A competition inside a club (e.g. "Inter-college Football Cup").
 *
 * Roles inside an event:
 *   admins   (max 2)  -> full control
 *   managers          -> can run matches, post updates, edit the event
 *   participants      -> joined players
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "events")
public class Event extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 4000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id")
    private Club club;

    @ManyToMany
    @JoinTable(name = "event_admins",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> admins = new LinkedHashSet<>();

    @ManyToMany
    @JoinTable(name = "event_managers",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> managers = new LinkedHashSet<>();

    /** Everyone involved in the event (players who joined, promoted staff, team members). */
    @ManyToMany
    @JoinTable(name = "event_participants",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> participants = new LinkedHashSet<>();

    /** "users" = players form their own teams, "admin" = only admins create teams. */
    @Column(length = 20)
    private String teamsBy = "users";

    @Column(length = 2000)
    private String imgUrl;

    @Column(length = 60)
    private String sport;

    /** Gender restriction: "None", "Male", "Female" or "Mixed". */
    @Column(length = 20)
    private String genderRestriction;

    private Integer maxMale;

    private Integer maxFemale;

    /** e.g. "registration", "ongoing", "completed". */
    @Column(length = 30)
    private String status;

    private int minPlayer = 1;

    /** Maximum players per team. */
    @Column(nullable = false)
    private Integer maxPlayer;

    private boolean scheduleLocked;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<EventRule> rules = new ArrayList<>();

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<EventUpdate> updates = new ArrayList<>();

    @OneToMany(mappedBy = "event")
    @OrderBy("createdAt ASC")
    private Set<Team> teams = new LinkedHashSet<>();

    @OneToMany(mappedBy = "event")
    @OrderBy("createdAt ASC")
    private Set<Schedule> schedules = new LinkedHashSet<>();

    public boolean isAdmin(String userId) {
        return admins.stream().anyMatch(u -> u.getId().equals(userId));
    }

    public boolean isManager(String userId) {
        return managers.stream().anyMatch(u -> u.getId().equals(userId));
    }

    /** Admin OR manager. */
    public boolean isStaff(String userId) {
        return isAdmin(userId) || isManager(userId);
    }

    public String roleOf(String userId) {
        if (isAdmin(userId)) return "admin";
        if (isManager(userId)) return "manager";
        return "participant";
    }
}
