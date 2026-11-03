package com.venture.sports;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Starts the real server on a random port and talks STOMP to it, exactly like the browser:
 * live score pushes, club chat with acks, private queries, and rejected connections.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class RealtimeTest {

    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper json;

    private final RestTemplate rest = new RestTemplate();
    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUp() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
    }

    @Test
    void liveScoreIsPushedToEventSubscribers() throws Exception {
        JsonNode admin = signup("Admin");
        String token = admin.path("accessToken").asText();
        String clubId = api(HttpMethod.POST, "/clubs/new", token, Map.of("name", "Club")).path("tournament").path("_id").asText();
        String eventId = api(HttpMethod.POST, "/events/new", token,
                Map.of("clubid", clubId, "name", "Cup", "maxPlayer", 3)).path("eventId").asText();

        for (int i = 0; i < 2; i++) {
            JsonNode leader = signup("Lead" + i);
            String t = leader.path("accessToken").asText();
            api(HttpMethod.POST, "/teams/new-team", t, Map.of("teamname", "T" + i, "eventid", eventId));
        }
        for (JsonNode team : api(HttpMethod.GET, "/teams/" + eventId, token, null)) {
            String leaderToken = tokens.get(team.path("leader").path("_id").asText());
            api(HttpMethod.POST, "/teams/register", leaderToken, Map.of("teamid", team.path("_id").asText()));
        }
        api(HttpMethod.POST, "/events/" + eventId + "/schedule", token, null);
        String matchId = api(HttpMethod.GET, "/events/" + eventId + "/stages", token, null)
                .get(0).path("matches").get(0).path("_id").asText();

        StompSession viewer = connect(signup("Viewer").path("accessToken").asText());
        BlockingQueue<JsonNode> received = subscribe(viewer, "/topic/event/" + eventId);
        Thread.sleep(300);   // let the SUBSCRIBE frame reach the server

        api(HttpMethod.POST, "/events/matches/" + matchId + "/start", token, null);
        assertThat(received.poll(5, TimeUnit.SECONDS).path("type").asText()).isEqualTo("match:started");

        api(HttpMethod.PUT, "/events/matches/" + matchId + "/round/score", token, Map.of("team", "A", "points", 7));
        JsonNode update = received.poll(5, TimeUnit.SECONDS);
        assertThat(update.path("type").asText()).isEqualTo("match:round:update");
        assertThat(update.path("data").path("matchId").asText()).isEqualTo(matchId);
        assertThat(update.path("data").path("teamA_score").asInt()).isEqualTo(7);
    }

    @Test
    void clubChatOverWebSocketWithAck() throws Exception {
        JsonNode admin = signup("Owner");
        String token = admin.path("accessToken").asText();
        String clubId = api(HttpMethod.POST, "/clubs/new", token, Map.of("name", "Chat Club")).path("tournament").path("_id").asText();

        StompSession session = connect(token);
        BlockingQueue<JsonNode> room = subscribe(session, "/topic/club/" + clubId);
        BlockingQueue<JsonNode> acks = subscribe(session, "/user/queue/ack");
        Thread.sleep(300);   // let the SUBSCRIBE frames reach the server

        session.send("/app/chat.send.club", Map.of("clubId", clubId, "message", "Hello club", "requestId", "r1"));

        JsonNode ack = acks.poll(5, TimeUnit.SECONDS);
        assertThat(ack.path("requestId").asText()).isEqualTo("r1");
        assertThat(ack.path("success").asBoolean()).isTrue();
        JsonNode broadcast = room.poll(5, TimeUnit.SECONDS);
        assertThat(broadcast.path("type").asText()).isEqualTo("chat:new:club");
        assertThat(broadcast.path("data").path("text").asText()).isEqualTo("Hello club");
        // dates must be ISO strings (the React app does new Date(createdAt))
        assertThat(broadcast.path("data").path("createdAt").isTextual()).isTrue();

        // non-admin gets a failed ack, no broadcast
        JsonNode member = signup("Member");
        String memberToken = member.path("accessToken").asText();
        api(HttpMethod.POST, "/clubs/join", memberToken, Map.of("clubId", clubId));
        StompSession memberSession = connect(memberToken);
        BlockingQueue<JsonNode> memberAcks = subscribe(memberSession, "/user/queue/ack");
        Thread.sleep(300);
        memberSession.send("/app/chat.send.club", Map.of("clubId", clubId, "message", "spam", "requestId", "r2"));
        JsonNode denied = memberAcks.poll(5, TimeUnit.SECONDS);
        assertThat(denied.path("success").asBoolean()).isFalse();
        assertThat(room.poll(500, TimeUnit.MILLISECONDS)).isNull();
    }

    @Test
    void privateQueryReachesOrganiserQueue() throws Exception {
        JsonNode admin = signup("Organiser");
        String adminToken = admin.path("accessToken").asText();
        String clubId = api(HttpMethod.POST, "/clubs/new", adminToken, Map.of("name", "Q Club")).path("tournament").path("_id").asText();
        String eventId = api(HttpMethod.POST, "/events/new", adminToken,
                Map.of("clubid", clubId, "name", "Q Cup", "maxPlayer", 3)).path("eventId").asText();

        StompSession organiser = connect(adminToken);
        BlockingQueue<JsonNode> organiserQueue = subscribe(organiser, "/user/queue/events");

        JsonNode participant = signup("Asker");
        StompSession asker = connect(participant.path("accessToken").asText());
        BlockingQueue<JsonNode> askerQueue = subscribe(asker, "/user/queue/events");
        Thread.sleep(300);

        asker.send("/app/query.send", Map.of("eventId", eventId, "message", "Is parking free?"));

        JsonNode toOrganiser = organiserQueue.poll(5, TimeUnit.SECONDS);
        assertThat(toOrganiser.path("type").asText()).isEqualTo("query:new");
        assertThat(toOrganiser.path("data").path("message").asText()).isEqualTo("Is parking free?");
        assertThat(askerQueue.poll(5, TimeUnit.SECONDS).path("type").asText()).isEqualTo("query:new");
    }

    @Test
    void connectionWithoutValidTokenIsRejected() throws Exception {
        StompSession session;
        try {
            session = connect("garbage");
        } catch (Exception expected) {
            return;   // the handshake failed: good
        }
        assertThat(waitUntilDisconnected(session)).isTrue();
    }

    @Test
    void cannotSubscribeToAClubYouAreNotIn() throws Exception {
        JsonNode owner = signup("Boss");
        String clubId = api(HttpMethod.POST, "/clubs/new", owner.path("accessToken").asText(),
                Map.of("name", "Private")).path("tournament").path("_id").asText();

        StompSession outsider = connect(signup("Outsider").path("accessToken").asText());
        subscribe(outsider, "/topic/club/" + clubId);
        assertThat(waitUntilDisconnected(outsider)).isTrue();   // server answered with ERROR and closed it
    }

    // ------------------------------------------------------------------ helpers

    private final Map<String, String> tokens = new java.util.concurrent.ConcurrentHashMap<>();

    private JsonNode signup(String name) {
        String unique = name.toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8);
        JsonNode res = api(HttpMethod.POST, "/auth/signup", null, Map.of("username", unique, "name", name,
                "email", unique + "@test.com", "password", "secret123", "gender", "Male"));
        tokens.put(res.path("user").path("id").asText(), res.path("accessToken").asText());
        return res;
    }

    private JsonNode api(HttpMethod method, String path, String token, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) headers.setBearerAuth(token);
        try {
            String response = rest.exchange("http://localhost:" + port + path, method,
                    new HttpEntity<>(body == null ? null : json.writeValueAsString(body), headers), String.class).getBody();
            return response == null ? json.nullNode() : json.readTree(response);
        } catch (Exception e) {
            throw new AssertionError(method + " " + path + " failed: " + e.getMessage(), e);
        }
    }

    private StompSession connect(String token) throws Exception {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + token);
        return stompClient.connectAsync("ws://localhost:" + port + "/ws", new WebSocketHttpHeaders(),
                connectHeaders, new StompSessionHandlerAdapter() { }).get(5, TimeUnit.SECONDS);
    }

    private BlockingQueue<JsonNode> subscribe(StompSession session, String destination) {
        BlockingQueue<JsonNode> queue = new LinkedBlockingQueue<>();
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return JsonNode.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((JsonNode) payload);
            }
        });
        return queue;
    }

    private static boolean waitUntilDisconnected(StompSession session) throws InterruptedException {
        for (int i = 0; i < 30 && session.isConnected(); i++) Thread.sleep(100);
        return !session.isConnected();
    }
}
