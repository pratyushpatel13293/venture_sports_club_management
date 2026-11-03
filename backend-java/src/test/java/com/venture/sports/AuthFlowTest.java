package com.venture.sports;

import com.fasterxml.jackson.databind.JsonNode;
import com.venture.sports.auth.EmailService;
import com.venture.sports.support.ApiTestBase;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowTest extends ApiTestBase {

    /** Replace the real e-mail sender so the test can read the OTP that would have been mailed. */
    @MockitoBean
    EmailService emailService;

    @Test
    void signupLoginMeAndRefresh() throws Exception {
        Session alice = signup("Alice", "Female");
        assertThat(alice.token()).isNotBlank();

        // duplicate sign-up is rejected
        JsonNode dup = post("/auth/signup", null, Map.of("username", alice.username(), "name", "A",
                "email", alice.email(), "password", "secret123"), 400);
        assertThat(dup.path("message").asText()).isEqualTo("User already exists!");

        // login returns tokens + user {id, username, name, email}
        JsonNode login = post("/auth/login", null, Map.of("email", alice.email(), "password", "secret123"), 200);
        assertThat(login.path("user").path("id").asText()).isEqualTo(alice.id());
        assertThat(login.path("accessToken").asText()).isNotBlank();

        // wrong password -> 400 with the same message as unknown e-mail
        JsonNode wrong = post("/auth/login", null, Map.of("email", alice.email(), "password", "nope-nope"), 400);
        assertThat(wrong.path("error").asText()).isEqualTo("Invalid email or password");

        // /auth/me never exposes the password
        Session fresh = new Session(alice.id(), login.path("accessToken").asText(),
                login.path("refreshToken").asText(), alice.email(), alice.username());
        JsonNode me = get200("/auth/me", fresh);
        assertThat(me.path("_id").asText()).isEqualTo(alice.id());
        assertThat(me.has("password")).isFalse();

        // refresh works with the latest refresh token...
        JsonNode refreshed = post("/auth/refresh", null, Map.of("refreshToken", fresh.refreshToken()), 200);
        assertThat(refreshed.path("accessToken").asText()).isNotBlank();
        // ...but the token from the first sign-up was replaced by the login (only one current token)
        post("/auth/refresh", null, Map.of("refreshToken", alice.refreshToken()), 401);
    }

    @Test
    void protectedRoutesNeedAValidToken() throws Exception {
        JsonNode noHeader = get("/auth/me", null, 401);
        assertThat(noHeader.path("error").asText()).isEqualTo("No auth header");

        Session fake = new Session("x", "not-a-jwt", null, null, null);
        JsonNode bad = get("/auth/me", fake, 401);
        assertThat(bad.path("error").asText()).isEqualTo("Invalid token");
    }

    @Test
    void validationErrorsAre400() throws Exception {
        JsonNode res = post("/auth/signup", null, Map.of("username", "x", "name", "", "email", "not-an-email",
                "password", "1"), 400);
        assertThat(res.path("message").asText()).isNotBlank();
    }

    @Test
    void forgotPasswordWithOtp() throws Exception {
        Session bob = signup("Bob", "Male");

        // unknown e-mail: same answer, but nothing is sent
        post("/auth/forgot-password", null, Map.of("email", "nobody@test.com"), 200);
        verify(emailService, never()).sendOtp(eq("nobody@test.com"), org.mockito.ArgumentMatchers.anyString(), anyInt());

        post("/auth/forgot-password", null, Map.of("email", bob.email()), 200);
        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtp(eq(bob.email()), otp.capture(), anyInt());

        // reset before verifying is refused
        post("/auth/reset-password", null, Map.of("email", bob.email(), "newPassword", "brandnew1"), 400);

        post("/auth/verify-forgot-otp", null, Map.of("email", bob.email(), "otp", "000000".equals(otp.getValue()) ? "111111" : "000000"), 400);
        post("/auth/verify-forgot-otp", null, Map.of("email", bob.email(), "otp", otp.getValue()), 200);
        post("/auth/reset-password", null, Map.of("email", bob.email(), "newPassword", "brandnew1"), 200);

        // the OTP was single-use
        post("/auth/reset-password", null, Map.of("email", bob.email(), "newPassword", "again123"), 400);

        post("/auth/login", null, Map.of("email", bob.email(), "password", "secret123"), 400);
        post("/auth/login", null, Map.of("email", bob.email(), "password", "brandnew1"), 200);
    }

    @Test
    void loggedInUserCanChangePassword() throws Exception {
        Session carol = signup("Carol", "Female");
        post("/auth/reset-password", carol, Map.of("newPassword", "changed99"), 200);
        post("/auth/login", null, Map.of("email", carol.email(), "password", "changed99"), 200);
    }

    @Test
    void searchUsers() throws Exception {
        Session dave = signup("Dave", "Male");
        JsonNode found = post("/auth/search-users", dave, Map.of("q", dave.username().substring(0, 6)), 200);
        assertThat(found.isArray()).isTrue();
        assertThat(found.findValuesAsText("_id")).contains(dave.id());
        assertThat(found.get(0).has("password")).isFalse();
    }
}
