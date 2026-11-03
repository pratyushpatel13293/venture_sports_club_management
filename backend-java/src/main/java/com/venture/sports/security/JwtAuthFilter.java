package com.venture.sports.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Runs once for every HTTP request, before the controller.
 * Equivalent of the Node "authenticate" middleware.
 *
 *  Authorization: Bearer eyJhbGciOi...
 *        │
 *        ▼
 *  valid token?  ── yes ──> put AuthUser into the SecurityContext (request is "logged in")
 *        │
 *        no ──> leave it anonymous; if the route needs login,
 *               RestAuthEntryPoint answers 401 and the React app refreshes the token
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String JWT_ERROR_ATTRIBUTE = "jwt_error";

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            try {
                AuthUser user = jwtService.parseAccessToken(token);
                var authentication = new UsernamePasswordAuthenticationToken(user, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException e) {
                request.setAttribute(JWT_ERROR_ATTRIBUTE, "Invalid token");
            }
        }

        chain.doFilter(request, response);
    }
}
