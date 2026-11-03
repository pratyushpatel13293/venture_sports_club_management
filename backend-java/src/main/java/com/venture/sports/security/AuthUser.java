package com.venture.sports.security;

/**
 * Who is making the request, taken from the verified JWT.
 * Controllers receive it with @AuthenticationPrincipal AuthUser me.
 */
public record AuthUser(String id, String username, String name, String email) {
}
