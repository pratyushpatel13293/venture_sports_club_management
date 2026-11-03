package com.venture.sports.config;

import com.venture.sports.security.JwtAuthFilter;
import com.venture.sports.security.JwtService;
import com.venture.sports.security.RestAuthEntryPoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

/**
 * Security rules for every HTTP request.
 *
 * Request ──> CorsFilter ──> JwtAuthFilter ──> AuthorizationFilter ──> Controller
 *
 *  - stateless: no HTTP session, the JWT is the only proof of identity
 *  - CSRF off: CSRF attacks abuse cookies; we use an Authorization header instead
 *  - public routes: signup/login/refresh/forgot-password, health check, WebSocket handshake
 *    (the WebSocket checks its JWT itself in StompAuthInterceptor)
 */
@Configuration
public class SecurityConfig {

    private static final String[] PUBLIC_POST = {
            "/auth/signup", "/auth/login",
            "/auth/*/signup", "/auth/*/login",
            "/auth/refresh",
            "/auth/forgot-password", "/auth/verify-forgot-otp",
            // reset-password is public for the "forgot password" flow; the service then
            // requires either a logged-in user or a freshly verified OTP.
            "/auth/reset-password"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtService jwtService,
                                                   RestAuthEntryPoint entryPoint) throws Exception {
        http
                .cors(cors -> {})   // uses the corsConfigurationSource bean below
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/", "/health").permitAll()
                        .requestMatchers(HttpMethod.POST, PUBLIC_POST).permitAll()
                        .requestMatchers("/ws/**", "/error").permitAll()
                        .anyRequest().authenticated())
                // Not a Spring bean on purpose: a @Bean Filter would also be auto-registered
                // with Tomcat and run twice.
                .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** BCrypt with cost 10 = 2^10 hashing rounds, same as bcrypt.hash(password, 10) in Node. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    /** Which websites (origins) may call this API from the browser. */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(props.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(Duration.ofHours(1));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
