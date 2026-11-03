package com.venture.sports.event;

import com.venture.sports.common.BaseEntity;
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

/**
 * A private support message between a participant and the event organisers.
 * targetUser = the participant the conversation belongs to.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "query_messages", indexes = {
        @Index(name = "idx_query_event_created", columnList = "event_id, created_at")
})
public class QueryMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User sender;

    /** "participant" or "event-admin". */
    @Column(nullable = false, length = 20)
    private String senderRole;

    @Column(nullable = false, length = 4000)
    private String message;

    /** "private" or "public". */
    @Column(nullable = false, length = 10)
    private String visibility = "private";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User targetUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private QueryMessage replyTo;
}
