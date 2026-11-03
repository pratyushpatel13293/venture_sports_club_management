package com.venture.sports.team;

import com.venture.sports.common.BaseEntity;
import com.venture.sports.event.Event;
import com.venture.sports.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
 * A team inside one event. The leader is always also a member.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "teams")
public class Team extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String teamname;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leader_id")
    private User leader;

    @ManyToMany
    @JoinTable(name = "team_members",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    @OrderBy("username ASC")
    private Set<User> members = new LinkedHashSet<>();

    /** Pending invitations sent by the leader. */
    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<TeamRequest> requests = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "team_invited_emails", joinColumns = @JoinColumn(name = "team_id"))
    @Column(name = "email", length = 180)
    private List<String> invitedEmails = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    /** Set by the leader once the roster is final. Only registered teams get scheduled. */
    private boolean registered;

    public boolean isLeader(String userId) {
        return leader != null && leader.getId().equals(userId);
    }

    public boolean hasMember(String userId) {
        return members.stream().anyMatch(u -> u.getId().equals(userId));
    }
}
