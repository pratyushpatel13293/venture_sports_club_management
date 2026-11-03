package com.venture.sports.realtime;

import com.venture.sports.security.AuthUser;

import java.security.Principal;

/** The logged-in user of one WebSocket session. getName() = user id, used by convertAndSendToUser. */
public record StompPrincipal(AuthUser user) implements Principal {

    @Override
    public String getName() {
        return user.id();
    }
}
