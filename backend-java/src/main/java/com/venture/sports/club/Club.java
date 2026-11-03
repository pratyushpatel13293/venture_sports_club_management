package com.venture.sports.club;

import com.venture.sports.common.BaseEntity;
import com.venture.sports.event.Event;
import com.venture.sports.user.User;
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

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * A club (the UI also calls it a "tournament") that owns many events.
 *
 *   clubs 1 ── * events          (Event.club is the foreign key)
 *   clubs * ── * users           (join table club_members)
 *   clubs * ── * users           (join table club_managers)
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "clubs")
public class Club extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 2000)
    private String description = "";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "admin_id")
    private User admin;

    @ManyToMany
    @JoinTable(name = "club_managers",
            joinColumns = @JoinColumn(name = "club_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> managers = new LinkedHashSet<>();

    @ManyToMany
    @JoinTable(name = "club_members",
            joinColumns = @JoinColumn(name = "club_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> members = new LinkedHashSet<>();

    /** Read-only side of the relationship: Event.club owns the foreign key. */
    @OneToMany(mappedBy = "club")
    @OrderBy("createdAt ASC")
    private Set<Event> events = new LinkedHashSet<>();

    public boolean isAdmin(String userId) {
        return admin != null && admin.getId().equals(userId);
    }

    public boolean isManager(String userId) {
        return managers.stream().anyMatch(u -> u.getId().equals(userId));
    }
}
