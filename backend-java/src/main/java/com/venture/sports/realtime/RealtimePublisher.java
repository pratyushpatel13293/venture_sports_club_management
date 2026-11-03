package com.venture.sports.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Pushes real-time messages to connected browsers over STOMP.
 *
 * Every message is an envelope {"type": "match:round:update", "data": {...}} so the frontend
 * can keep the same event names it used with Socket.IO.
 *
 * Destinations ("rooms"):
 *   /topic/event/{eventId}   everyone watching an event (live scores, event chat)
 *   /topic/club/{clubId}     everyone in a club chat
 *   /user/{userId}/queue/events   one specific user (private support queries)
 *
 * If called inside a DB transaction, the message is sent only AFTER the commit succeeds,
 * so clients never see a score that was rolled back.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimePublisher {

    public static final String USER_EVENTS_QUEUE = "/queue/events";
    public static final String USER_ACK_QUEUE = "/queue/ack";

    private final SimpMessagingTemplate messaging;

    public void toEvent(String eventId, String type, Object data) {
        send(() -> messaging.convertAndSend("/topic/event/" + eventId, envelope(type, data)));
    }

    public void toClub(String clubId, String type, Object data) {
        send(() -> messaging.convertAndSend("/topic/club/" + clubId, envelope(type, data)));
    }

    public void toUser(String userId, String type, Object data) {
        send(() -> messaging.convertAndSendToUser(userId, USER_EVENTS_QUEUE, envelope(type, data)));
    }

    private static Map<String, Object> envelope(String type, Object data) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", type);
        envelope.put("data", data);
        return envelope;
    }

    private void send(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    safeRun(action);
                }
            });
        } else {
            safeRun(action);
        }
    }

    private void safeRun(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            // A broken socket must never break the HTTP request that triggered it.
            log.warn("Real-time publish failed: {}", e.getMessage());
        }
    }
}
