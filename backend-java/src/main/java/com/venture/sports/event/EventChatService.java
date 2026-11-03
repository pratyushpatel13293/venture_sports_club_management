package com.venture.sports.event;

import com.venture.sports.club.ChatMessage;
import com.venture.sports.club.ChatMessageRepository;
import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.realtime.RealtimePublisher;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.Views.ChatView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Announcements inside an event room (WebSocket "chat:send"). Event admins or the club admin only. */
@Service
@RequiredArgsConstructor
public class EventChatService {

    private final ChatMessageRepository chats;
    private final RealtimePublisher realtime;
    private final Finder finder;
    private final ViewMapper mapper;

    @Transactional
    public ChatView post(String eventId, String userId, String text) {
        if (text == null || text.isBlank()) throw ApiException.badRequest("eventId and non-empty message required");
        Event event = finder.event(eventId);
        boolean eventAdmin = event.isAdmin(userId);
        boolean clubAdmin = event.getClub().isAdmin(userId);
        if (!eventAdmin && !clubAdmin) throw ApiException.forbidden("Only event or club admins can send announcements");

        ChatMessage msg = new ChatMessage();
        msg.setEvent(event);
        msg.setSender(finder.user(userId));
        msg.setSenderRole(clubAdmin ? "club-admin" : "event-admin");
        msg.setText(text.trim());
        ChatView view = mapper.chat(chats.save(msg));

        realtime.toEvent(eventId, "chat:new", view);
        return view;
    }
}
