package com.venture.sports;

import com.fasterxml.jackson.databind.JsonNode;
import com.venture.sports.support.ApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end journey through the real HTTP API (MockMvc), the same calls the React app makes:
 * club -> event -> teams -> bracket -> live match -> winner, plus schedules, chat and queries.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TournamentFlowTest extends ApiTestBase {

    private record Setup(Session admin, String clubId, String eventId, List<Session> leaders, List<String> teamIds) {
    }

    /** Admin creates a club + event; `teams` players each create and register a team. */
    private Setup setup(int teams) throws Exception {
        Session admin = signup("Admin", "Male");
        JsonNode club = post("/clubs/new", admin, Map.of("name", "Campus League"), 201);
        String clubId = club.path("tournament").path("_id").asText();
        assertThat(club.path("tournament").path("admin").asText()).isEqualTo(admin.id());

        JsonNode created = post("/events/new", admin, Map.of("clubid", clubId, "name", "Football Cup",
                "description", "5-a-side", "maxPlayer", 5, "status", "registration", "teamc", "users"), 200);
        String eventId = created.path("eventId").asText();

        List<Session> leaders = new ArrayList<>();
        List<String> teamIds = new ArrayList<>();
        for (int i = 1; i <= teams; i++) {
            Session leader = signup("Leader" + i, "Male");
            post("/clubs/join", leader, Map.of("clubId", clubId), 200);
            post("/teams/new-team", leader, Map.of("teamname", "Team " + i, "eventid", eventId), 200);
            leaders.add(leader);
        }
        JsonNode teamList = get200("/teams/" + eventId, admin);
        for (JsonNode t : teamList) {
            teamIds.add(t.path("_id").asText());
        }
        for (Session leader : leaders) {
            String myTeam = null;
            for (JsonNode t : teamList) {
                if (t.path("leader").path("_id").asText().equals(leader.id())) myTeam = t.path("_id").asText();
            }
            post("/teams/register", leader, Map.of("teamid", myTeam), 200);
        }
        return new Setup(admin, clubId, eventId, leaders, teamIds);
    }

    @Test
    void clubsAndEventsAppearForTheRightPeople() throws Exception {
        Setup s = setup(2);

        JsonNode mine = get200("/clubs/my-admin", s.admin());
        assertThat(mine.path("tournaments").findValuesAsText("_id")).contains(s.clubId());

        JsonNode joined = get200("/clubs/participant", s.leaders().get(0));
        assertThat(joined.path("tournaments").findValuesAsText("_id")).contains(s.clubId());

        JsonNode event = get200("/events/" + s.eventId(), s.admin());
        assertThat(event.path("role").asText()).isEqualTo("admin");
        assertThat(event.path("event").path("name").asText()).isEqualTo("Football Cup");
        assertThat(event.path("event").path("teams")).hasSize(2);
        assertThat(get200("/events/" + s.eventId(), s.leaders().get(0)).path("role").asText()).isEqualTo("participant");

        JsonNode clubEvents = get200("/events/club/" + s.clubId(), s.admin());
        assertThat(clubEvents.path("club").asText()).isEqualTo("Campus League");
        assertThat(clubEvents.path("events")).hasSize(1);

        // a normal member can't create events in the club
        post("/events/new", s.leaders().get(0), Map.of("clubid", s.clubId(), "name", "X", "maxPlayer", 3), 403);
    }

    @Test
    void promoteEditAndAnnounce() throws Exception {
        Setup s = setup(2);
        Session helper = s.leaders().get(0);

        post("/events/promote", helper, Map.of("eventid", s.eventId(), "userid", helper.id(), "post", "manager"), 403);
        post("/events/promote", s.admin(), Map.of("eventid", s.eventId(), "userid", helper.id(), "post", "manager"), 200);
        post("/events/promote", s.admin(), Map.of("eventid", s.eventId(), "userid", helper.id(), "post", "manager"), 400);

        JsonNode roles = get200("/events/roles/" + s.eventId(), s.admin());
        assertThat(roles.path("managers").findValuesAsText("_id")).contains(helper.id());

        // managers can edit the event, including rules
        JsonNode edited = post("/extra/" + s.eventId() + "/edit-event", helper, Map.of(
                "name", "Football Cup 2026", "Sport", "Football", "genderres", "Mixed", "maxmale", 3, "maxfemale", 2,
                "rules", List.of(Map.of("title", "Timing", "points", List.of("2 halves", "10 minutes each")))), 200);
        assertThat(edited.path("event").path("name").asText()).isEqualTo("Football Cup 2026");
        assertThat(edited.path("event").path("Sport").asText()).isEqualTo("Football");
        assertThat(edited.path("event").path("rules").get(0).path("points")).hasSize(2);

        post("/extra/" + s.eventId() + "/edit-event", helper,
                Map.of("rules", List.of(Map.of("title", "Empty", "points", List.of()))), 400);

        post("/events/updates", helper, Map.of("eventid", s.eventId(), "message", "Kick-off at 4 PM"), 200);
        JsonNode event = get200("/events/" + s.eventId(), s.admin());
        assertThat(event.path("event").path("updates").get(0).path("message").asText()).isEqualTo("Kick-off at 4 PM");
        assertThat(event.path("event").path("genderres").asText()).isEqualTo("Mixed");
    }

    @Test
    void teamInviteAcceptLeaveAndLeadership() throws Exception {
        Setup s = setup(1);
        Session leader = s.leaders().get(0);
        String teamId = s.teamIds().get(0);
        Session player = signup("Player", "Male");

        // registered teams are frozen; un-register by creating a fresh team for this test
        Session leader2 = signup("Leader2", "Male");
        post("/teams/new-team", leader2, Map.of("teamname", "Fresh", "eventid", s.eventId()), 200);
        post("/teams/new-team", leader2, Map.of("teamname", "Twice", "eventid", s.eventId()), 400);
        String freshId = null;
        for (JsonNode t : get200("/teams/" + s.eventId(), leader2)) {
            if (t.path("teamname").asText().equals("Fresh")) freshId = t.path("_id").asText();
        }

        post("/teams/invite", player, Map.of("teamid", freshId, "userid", player.id()), 403);
        post("/teams/invite", leader, Map.of("teamid", teamId, "userid", player.id()), 400); // already registered
        post("/teams/invite", leader2, Map.of("teamid", freshId, "userid", player.id()), 200);
        post("/teams/invite", leader2, Map.of("teamid", freshId, "userid", player.id()), 400); // already invited

        JsonNode inbox = get200("/teams/team/notifications", player);
        assertThat(inbox.path("notifications")).hasSize(1);
        JsonNode note = inbox.path("notifications").get(0);
        assertThat(note.path("teamName").asText()).isEqualTo("Fresh");
        assertThat(note.path("requser").asText()).isEqualTo(leader2.id());

        post("/teams/team/accept-request", player, Map.of("notificationId", note.path("id").asText()), 200);
        assertThat(get200("/teams/team/notifications", player).path("notifications")).isEmpty();

        JsonNode team = get200("/teams/team/" + freshId, player);
        assertThat(team.path("members").findValuesAsText("_id")).contains(player.id(), leader2.id());
        assertThat(team.path("members").get(0).has("gender")).isTrue();

        post("/teams/make-admin", leader2, Map.of("teamid", freshId, "userid", player.id()), 200);
        JsonNode afterTransfer = get200("/teams/team/" + freshId, player);
        assertThat(afterTransfer.path("leader").path("_id").asText()).isEqualTo(player.id());
        assertThat(afterTransfer.path("members").findValuesAsText("_id")).contains(leader2.id());

        post("/teams/leave", leader2, Map.of("teamid", freshId), 200);
        post("/teams/leave", player, Map.of("teamid", freshId), 400); // leader can't leave
        put("/teams/edit", player, Map.of("teamid", freshId, "name", "Renamed"), 200);
        post("/teams/dismantle", player, Map.of("teamid", freshId), 200);
        get("/teams/team/" + freshId, player, 404);
    }

    @Test
    void knockoutBracketFromStartToChampion() throws Exception {
        Setup s = setup(4);
        Session admin = s.admin();

        post("/events/" + s.eventId() + "/schedule", s.leaders().get(0), null, 403);
        JsonNode generated = post("/events/" + s.eventId() + "/schedule", admin, null, 201);
        assertThat(generated.path("bracketSize").asInt()).isEqualTo(4);
        assertThat(generated.path("stages").asInt()).isEqualTo(2);
        post("/events/" + s.eventId() + "/schedule", admin, null, 400); // only once

        JsonNode stages = get200("/events/" + s.eventId() + "/stages", admin);
        assertThat(stages).hasSize(2);
        assertThat(stages.get(0).path("name").asText()).isEqualTo("Semi Final");
        assertThat(stages.get(1).path("name").asText()).isEqualTo("Final");
        assertThat(stages.get(0).path("matches")).hasSize(2);
        assertThat(stages.get(0).path("matches").get(0).path("teamA").path("teamId").path("teamname").asText())
                .startsWith("Team ");
        assertThat(stages.get(1).path("matches").get(0).path("teamA").path("teamId").isNull()).isTrue();

        put("/events/" + s.eventId() + "/lock-schedule", admin, null, 200);
        put("/events/" + s.eventId() + "/lock-schedule", admin, null, 400);

        String semi1 = stages.get(0).path("matches").get(0).path("_id").asText();
        String semi2 = stages.get(0).path("matches").get(1).path("_id").asText();
        String finalMatch = stages.get(1).path("matches").get(0).path("_id").asText();

        String winner1 = playMatch(admin, semi1, 2, 1);   // team A wins
        String winner2 = playMatch(admin, semi2, 0, 3);   // team B wins

        JsonNode fin = get200("/events/matches/" + finalMatch, admin);
        assertThat(fin.path("teamA").path("teamId").path("_id").asText()).isEqualTo(winner1);
        assertThat(fin.path("teamB").path("teamId").path("_id").asText()).isEqualTo(winner2);
        assertThat(fin.path("teamA").path("autoAdvanced").asBoolean()).isTrue();

        JsonNode noWinnerYet = get200("/events/" + s.eventId() + "/winner", admin);
        assertThat(noWinnerYet.path("winner").isNull()).isTrue();

        // a tied match can't be ended
        post("/events/matches/" + finalMatch + "/start", admin, null, 200);
        put("/events/matches/" + finalMatch + "/round/score", admin, Map.of("team", "A", "points", 1), 200);
        put("/events/matches/" + finalMatch + "/round/score", admin, Map.of("team", "B", "points", 1), 200);
        post("/events/matches/" + finalMatch + "/round/end", admin, null, 200);
        post("/events/matches/" + finalMatch + "/end", admin, null, 400);
        // play a decider round
        put("/events/matches/" + finalMatch + "/round/score", admin, Map.of("team", "B", "points", 5), 200);
        post("/events/matches/" + finalMatch + "/round/end", admin, null, 200);
        JsonNode ended = post("/events/matches/" + finalMatch + "/end", admin, null, 200);
        assertThat(ended.path("winner").asText()).isEqualTo(winner2);

        JsonNode champion = get200("/events/" + s.eventId() + "/winner", admin);
        assertThat(champion.path("winner").path("_id").asText()).isEqualTo(winner2);

        // AI widgets work on real results
        JsonNode prediction = get200("/ai/match/" + finalMatch + "/prediction", admin);
        assertThat(prediction.path("probabilityA").asInt() + prediction.path("probabilityB").asInt()).isEqualTo(100);
        JsonNode highlights = get200("/ai/match/" + finalMatch + "/highlights", admin);
        assertThat(highlights.path("scoreLine").asText()).isEqualTo("1-0");
        assertThat(highlights.path("summary").asText()).isNotBlank();
    }

    @Test
    void oddNumberOfTeamsGetsByes() throws Exception {
        Setup s = setup(5);
        JsonNode generated = post("/events/" + s.eventId() + "/schedule", s.admin(), null, 201);
        assertThat(generated.path("bracketSize").asInt()).isEqualTo(8);
        assertThat(generated.path("byeCount").asInt()).isEqualTo(3);
        assertThat(generated.path("firstRoundMatches").asInt()).isEqualTo(1);

        JsonNode stages = get200("/events/" + s.eventId() + "/stages", s.admin());
        assertThat(stages).hasSize(3); // QF, SF, Final
        JsonNode qf = stages.get(0).path("matches");
        assertThat(qf).hasSize(4);
        long byes = 0;
        for (JsonNode m : qf) if (m.path("status").asText().equals("finished")) byes++;
        assertThat(byes).isEqualTo(3);

        // bye winners already moved into the semi-finals
        JsonNode sf = stages.get(1).path("matches");
        assertThat(sf.get(0).path("teamB").path("teamId").isNull()).isFalse();
        assertThat(sf.get(1).path("teamA").path("teamId").isNull()).isFalse();
        assertThat(sf.get(1).path("teamB").path("teamId").isNull()).isFalse();

        put("/events/" + s.eventId() + "/lock-schedule", s.admin(), null, 200);
    }

    @Test
    void schedulesAndManualMatches() throws Exception {
        Setup s = setup(4);
        Session admin = s.admin();

        post("/schedule/" + s.eventId() + "/new-schedule", admin,
                Map.of("title", "Day 1", "date", "2026-11-20", "time", "4:00 PM", "location", "Main ground"), 200);
        post("/schedule/" + s.eventId() + "/new-schedule", s.leaders().get(0),
                Map.of("title", "Hack", "date", "2026-11-20", "time", "1:00 PM", "location", "X"), 403);

        JsonNode schedules = get200("/events/" + s.eventId() + "/schedules", admin);
        assertThat(schedules).hasSize(1);
        String scheduleId = schedules.get(0).path("_id").asText();
        assertThat(schedules.get(0).path("date").asText()).isEqualTo("2026-11-20");

        JsonNode available = get200("/match/available-teams/" + scheduleId, admin);
        assertThat(available.path("teams")).hasSize(4);

        String a = s.teamIds().get(0);
        String b = s.teamIds().get(1);
        JsonNode created = post("/match/create", admin, Map.of("eventid", s.eventId(), "scheduleid", scheduleId,
                "teamA", a, "teamB", b, "slotIndex", 1, "matchType", "Day 1"), 201);
        String matchId = created.path("match").path("_id").asText();
        post("/match/create", admin, Map.of("eventid", s.eventId(), "scheduleid", scheduleId,
                "teamA", a, "teamB", s.teamIds().get(2)), 400); // team A already playing today

        assertThat(get200("/match/available-teams/" + scheduleId, admin).path("teams")).hasSize(2);

        JsonNode details = get200("/schedule/" + scheduleId, admin);
        assertThat(details.path("role").asText()).isEqualTo("admin");
        assertThat(details.path("matches").get(0).path("teamA").path("teamId").path("teamname").asText()).isNotBlank();

        JsonNode bySchedule = get200("/match/schedule/" + scheduleId, admin);
        assertThat(bySchedule.path("matches").get(0).path("teamA").path("teamId").path("members")).hasSize(1);

        JsonNode smart = get200("/ai/schedule/" + scheduleId + "/smart-schedule", admin);
        assertThat(smart.path("recommendations")).hasSize(1);
        assertThat(smart.path("recommendations").get(0).path("recommendedTime").asText()).isEqualTo("4:00 PM");
        JsonNode rec = smart.path("recommendations").get(0);
        post("/ai/schedule/" + scheduleId + "/smart-schedule/apply", admin, Map.of("pairings", List.of(Map.of(
                "teamAId", rec.path("teamA").path("_id").asText(),
                "teamBId", rec.path("teamB").path("_id").asText(),
                "slotIndex", rec.path("slotIndex").asInt()))), 201);

        assertThat(get200("/match/all/" + s.eventId(), admin).path("matches")).hasSize(2);

        // old single-round routes
        put("/match/" + matchId + "/start", admin, Map.of("eventid", s.eventId()), 200);
        put("/match/" + matchId + "/score", admin, Map.of("teamA_score", 3, "teamB_score", 1), 200);
        JsonNode finished = put("/match/" + matchId + "/finish", admin, Map.of("eventid", s.eventId()), 200);
        assertThat(finished.path("winner").asText()).isEqualTo(a);
        JsonNode full = get200("/match/" + matchId, admin);
        assertThat(full.path("winner").path("teamname").asText()).isEqualTo("Team 1");
        assertThat(get200("/match/all/" + s.eventId(), admin).path("matches")).hasSize(1);
    }

    @Test
    void clubChatAndSupportQueries() throws Exception {
        Setup s = setup(1);
        Session member = s.leaders().get(0);

        post("/clubs/" + s.clubId() + "/chat", member, Map.of("message", "hi"), 403);
        JsonNode posted = post("/clubs/" + s.clubId() + "/chat", s.admin(), Map.of("message", "Welcome!"), 200);
        assertThat(posted.path("data").path("text").asText()).isEqualTo("Welcome!");
        JsonNode history = get200("/clubs/" + s.clubId() + "/chat", member);
        assertThat(history.path("data").get(0).path("sender").path("username").asText()).isEqualTo(s.admin().username());

        JsonNode club = get200("/clubs/" + s.clubId(), member);
        assertThat(club.path("club").path("admin").asText()).isEqualTo(s.admin().id());

        post("/events/" + s.eventId() + "/queries", member, Map.of("message", "When is the final?"), 201);
        post("/events/" + s.eventId() + "/queries", s.admin(),
                Map.of("message", "Sunday!", "targetUser", member.id()), 201);
        Session stranger = signup("Stranger", "Male");
        post("/events/" + s.eventId() + "/queries", stranger, Map.of("message", "me too"), 201);

        JsonNode mine = get200("/events/" + s.eventId() + "/queries", member);
        assertThat(mine.path("data")).hasSize(2);   // only my own conversation
        JsonNode all = get200("/events/" + s.eventId() + "/queries", s.admin());
        assertThat(all.path("data")).hasSize(3);    // organisers see everything
    }

    @Test
    void leavingAndDeleting() throws Exception {
        Setup s = setup(2);
        post("/clubs/leave", s.admin(), Map.of("clubid", s.clubId()), 403);
        post("/clubs/leave", s.leaders().get(1), Map.of("clubid", s.clubId()), 200);
        assertThat(get200("/teams/" + s.eventId(), s.admin())).hasSize(1);   // their team was removed

        post("/events/" + s.eventId() + "/schedule", s.admin(), null, 400);   // only 1 team left
        delete("/clubs/delete", s.leaders().get(0), Map.of("eventid", s.eventId()), 403);
        delete("/clubs/delete", s.admin(), Map.of("eventid", s.eventId()), 200);
        get("/events/" + s.eventId(), s.admin(), 404);

        delete("/clubs/delete", s.admin(), Map.of("clubid", s.clubId()), 200);
        get("/clubs/" + s.clubId(), s.admin(), 404);
    }

    @Test
    void deletingAnEventWithABracketRemovesEverything() throws Exception {
        Setup s = setup(3);
        post("/events/" + s.eventId() + "/schedule", s.admin(), null, 201);
        post("/schedule/" + s.eventId() + "/new-schedule", s.admin(),
                Map.of("title", "Day 1", "date", "2026-11-20", "time", "4:00 PM", "location", "Main ground"), 200);
        delete("/clubs/delete", s.admin(), Map.of("eventid", s.eventId()), 200);
        get("/events/" + s.eventId() + "/stages", s.admin(), 200);
        assertThat(get200("/events/" + s.eventId() + "/stages", s.admin())).isEmpty();
    }

    /** Plays a one-round match and returns the winning team id. */
    private String playMatch(Session admin, String matchId, int scoreA, int scoreB) throws Exception {
        JsonNode before = get200("/events/matches/" + matchId, admin);
        post("/events/matches/" + matchId + "/start", admin, null, 200);
        post("/events/matches/" + matchId + "/start", admin, null, 400);
        put("/events/matches/" + matchId + "/round/score", admin, Map.of("team", "A", "points", scoreA), 200);
        JsonNode score = put("/events/matches/" + matchId + "/round/score", admin, Map.of("team", "B", "points", scoreB), 200);
        assertThat(score.path("teamA_score").asInt()).isEqualTo(scoreA);
        post("/events/matches/" + matchId + "/end", admin, null, 400);   // round still open
        post("/events/matches/" + matchId + "/round/end", admin, null, 200);
        JsonNode ended = post("/events/matches/" + matchId + "/end", admin, null, 200);
        String expected = before.path(scoreA > scoreB ? "teamA" : "teamB").path("teamId").path("_id").asText();
        assertThat(ended.path("winner").asText()).isEqualTo(expected);

        JsonNode after = get200("/events/matches/" + matchId, admin);
        assertThat(after.path("status").asText()).isEqualTo("finished");
        assertThat(after.path("winner").asText()).isEqualTo(expected);   // id string, as LiveMatchView expects
        assertThat(after.path("rounds").get(0).path("isCompleted").asBoolean()).isTrue();
        return expected;
    }
}
