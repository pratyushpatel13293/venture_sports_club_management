package com.venture.sports.event;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.realtime.RealtimePublisher;
import com.venture.sports.user.User;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.Views.QueryView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Private support chat between a participant and the event organisers.
 *
 *  participant ──"query:new"──> every admin/manager of the event + the participant
 *  organiser   ──"query:new"──> every admin/manager + the participant being answered
 */
@Service
@RequiredArgsConstructor
public class QueryService {

    private final QueryMessageRepository queries;
    private final RealtimePublisher realtime;
    private final Finder finder;
    private final ViewMapper mapper;

    @Transactional(readOnly = true)
    public List<QueryView> list(String eventId, String userId) {
        Event event = finder.event(eventId);
        List<QueryMessage> items = event.isStaff(userId)
                ? queries.findByEventIdOrderByCreatedAtAsc(eventId)
                : queries.findConversation(eventId, userId);
        return items.stream().map(mapper::query).toList();
    }

    @Transactional
    public QueryView send(String eventId, String userId, String message, String targetUserId, String replyToId) {
        if (message == null || message.isBlank()) throw ApiException.badRequest("Message required");
        Event event = finder.event(eventId);
        User sender = finder.user(userId);
        boolean organiser = event.isStaff(userId);

        QueryMessage q = new QueryMessage();
        q.setEvent(event);
        q.setSender(sender);
        q.setSenderRole(organiser ? "event-admin" : "participant");
        q.setMessage(message.trim());
        q.setVisibility("private");
        // A participant's message belongs to their own thread; an organiser replies into someone's thread.
        q.setTargetUser(organiser
                ? (targetUserId == null || targetUserId.isBlank() ? null : finder.user(targetUserId))
                : sender);
        if (replyToId != null && !replyToId.isBlank()) {
            q.setReplyTo(queries.findById(replyToId).orElse(null));
        }
        QueryView view = mapper.query(queries.save(q));

        Set<String> recipients = new LinkedHashSet<>();
        event.getAdmins().forEach(u -> recipients.add(u.getId()));
        event.getManagers().forEach(u -> recipients.add(u.getId()));
        if (q.getTargetUser() != null) recipients.add(q.getTargetUser().getId());
        recipients.forEach(uid -> realtime.toUser(uid, "query:new", view));

        return view;
    }
}
