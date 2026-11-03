package com.venture.sports.realtime;

import com.venture.sports.club.ClubRepository;
import com.venture.sports.security.AuthUser;
import com.venture.sports.security.JwtService;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Security for the WebSocket. Every STOMP frame from a browser passes through preSend():
 *
 *   CONNECT   -> must carry "Authorization: Bearer <jwt>"; we attach the user to the session
 *   SUBSCRIBE -> only to allowed destinations (and only to clubs you belong to)
 *   SEND      -> only after a successful CONNECT
 *
 * Throwing here makes Spring answer with a STOMP ERROR frame and close the connection.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final Pattern EVENT_TOPIC = Pattern.compile("^/topic/event/([\\w-]+)$");
    private static final Pattern CLUB_TOPIC = Pattern.compile("^/topic/club/([\\w-]+)$");

    private final JwtService jwtService;
    private final ClubRepository clubs;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;

        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT) {
            accessor.setUser(new StompPrincipal(authenticate(accessor.getFirstNativeHeader("Authorization"))));
        } else if (command == StompCommand.SUBSCRIBE) {
            String userId = requireUser(accessor);
            checkSubscription(accessor.getDestination(), userId);
        } else if (command == StompCommand.SEND) {
            requireUser(accessor);
        }
        return message;
    }

    private AuthUser authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Unauthorized: missing token");
        }
        try {
            return jwtService.parseAccessToken(header.substring(7).trim());
        } catch (JwtException | IllegalArgumentException e) {
            throw new MessageDeliveryException("Unauthorized: invalid token");
        }
    }

    private static String requireUser(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof StompPrincipal principal)) {
            throw new MessageDeliveryException("Unauthorized");
        }
        return principal.getName();
    }

    private void checkSubscription(String destination, String userId) {
        if (destination == null) throw new MessageDeliveryException("Missing destination");

        if (destination.equals("/user/queue/events") || destination.equals("/user/queue/ack")) return;
        if (EVENT_TOPIC.matcher(destination).matches()) return;   // live scores are public to logged-in users

        Matcher club = CLUB_TOPIC.matcher(destination);
        if (club.matches()) {
            if (clubs.countMembership(club.group(1), userId) > 0) return;
            throw new MessageDeliveryException("Not a member of this club");
        }
        log.warn("Blocked subscription by {} to {}", userId, destination);
        throw new MessageDeliveryException("Subscription not allowed: " + destination);
    }
}
