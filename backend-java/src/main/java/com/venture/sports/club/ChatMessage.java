package com.venture.sports.club;

import com.venture.sports.common.BaseEntity;
import com.venture.sports.event.Event;
import com.venture.sports.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/** An announcement posted by an admin in a club chat or an event chat. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_club_created", columnList = "club_id, created_at"),
        @Index(name = "idx_chat_event_created", columnList = "event_id, created_at")
})
public class ChatMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User sender;

    /** "event-admin", "club-admin" or "manager". */
    @Column(nullable = false, length = 20)
    private String senderRole;

    @Column(nullable = false, length = 4000)
    private String text;
}
