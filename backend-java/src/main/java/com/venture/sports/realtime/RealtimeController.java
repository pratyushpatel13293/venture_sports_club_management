package com.venture.sports.realtime;

import com.venture.sports.club.ClubService;
import com.venture.sports.common.ApiException;
import com.venture.sports.event.EventChatService;
import com.venture.sports.event.EventService;
import com.venture.sports.event.QueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Handles messages browsers SEND over the WebSocket (the old socket.on("...") handlers).
 *
 * Socket.IO had "acknowledgement callbacks". STOMP doesn't, so the client adds a requestId
 * and we answer on the user's private /user/queue/ack with the same requestId.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class RealtimeController {

    private final EventChatService eventChatService;
    private final ClubService clubService;
    private final QueryService queryService;
    private final EventService eventService;
    private final SimpMessagingTemplate messaging;

    @MessageMapping("chat.send")
    public void eventAnnouncement(@Payload Map<String, Object> payload, Principal principal) {
        reply(principal, payload, () -> eventChatService.post(str(payload, "eventId"), principal.getName(),
                str(payload, "message")));
    }

    @MessageMapping("chat.send.club")
    public void clubAnnouncement(@Payload Map<String, Object> payload, Principal principal) {
        reply(principal, payload, () -> clubService.postAnnouncement(str(payload, "clubId"), principal.getName(),
                str(payload, "message")));
    }

    @MessageMapping("query.send")
    public void query(@Payload Map<String, Object> payload, Principal principal) {
        reply(principal, payload, () -> queryService.send(str(payload, "eventId"), principal.getName(),
                str(payload, "message"), str(payload, "targetUser"), str(payload, "replyToId")));
    }

    /** Organisers already receive queries on their private queue; this just confirms they are organisers. */
    @MessageMapping("join.organizer")
    public void joinOrganizer(@Payload Map<String, Object> payload, Principal principal) {
        reply(principal, payload, () -> {
            if (!eventService.isStaff(str(payload, "eventId"), principal.getName())) {
                throw ApiException.forbidden("Not an organizer");
            }
            return null;
        });
    }

    private void reply(Principal principal, Map<String, Object> payload, Supplier<Object> action) {
        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("requestId", payload.get("requestId"));
        try {
            ack.put("success", true);
            ack.put("data", action.get());
        } catch (ApiException e) {
            ack.put("success", false);
            ack.put("error", e.getMessage());
        } catch (RuntimeException e) {
            log.error("WebSocket handler failed", e);
            ack.put("success", false);
            ack.put("error", "Server error");
        }
        messaging.convertAndSendToUser(principal.getName(), RealtimePublisher.USER_ACK_QUEUE, ack);
    }

    private static String str(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value == null ? null : value.toString();
    }
}
