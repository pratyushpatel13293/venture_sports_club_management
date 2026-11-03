package com.venture.sports.team;

import com.venture.sports.common.BaseEntity;
import com.venture.sports.user.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/** "Leader invited this user to the team" (requestedAt = createdAt). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "team_requests",
        uniqueConstraints = @UniqueConstraint(columnNames = {"team_id", "user_id"}))
public class TeamRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;
}
