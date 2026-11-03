package com.venture.sports.config;

import com.venture.sports.realtime.StompAuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket + STOMP setup (replaces Socket.IO).
 *
 *  browser ──ws://host/ws──> STOMP
 *     SEND      /app/chat.send          -> @MessageMapping("chat.send") in RealtimeController
 *     SUBSCRIBE /topic/event/{id}       <- broadcasts for one event ("rooms")
 *     SUBSCRIBE /user/queue/events      <- messages for this user only
 *
 * The simple in-memory broker is fine for one server. With several servers behind a
 * load balancer you would switch to an external broker (RabbitMQ / ActiveMQ) so a
 * message published on server 1 reaches browsers connected to server 2.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AppProperties props;
    private final StompAuthInterceptor stompAuthInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(props.cors().allowedOrigins().toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthInterceptor);
    }
}
