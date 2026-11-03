package com.venture.sports.event;

import com.venture.sports.event.EventDtos.*;
import com.venture.sports.match.BracketService;
import com.venture.sports.match.ScheduleMatchService;
import com.venture.sports.schedule.ScheduleService;
import com.venture.sports.security.AuthUser;
import com.venture.sports.web.Views.MatchView;
import com.venture.sports.web.Views.QueryView;
import com.venture.sports.web.Views.ScheduleView;
import com.venture.sports.web.Views.StageView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Event routes. (Match-control routes under /events/matches/... are in EventMatchController,
 * so neither file becomes a 1,600-line monster like the Node event.js.)
 */
@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final QueryService queryService;
    private final ScheduleService scheduleService;
    private final ScheduleMatchService scheduleMatchService;
    private final BracketService bracketService;

    public record CreateMatchRequest(String eventid, String scheduleid, String stageid, String teamA, String teamB,
                                     Integer slotIndex, String matchType) {
    }

    @PostMapping("/new")
    public Map<String, Object> create(@AuthenticationPrincipal AuthUser me, @RequestBody CreateEventRequest req) {
        String eventId = eventService.create(req, me.id());
        return Map.of("message", "event created", "eventId", eventId);
    }

    @PostMapping("/promote")
    public Map<String, String> promote(@AuthenticationPrincipal AuthUser me, @RequestBody PromoteRequest req) {
        return Map.of("message", eventService.promote(req.eventid(), req.userid(), req.post(), me.id()));
    }

    @PostMapping("/updates")
    public Map<String, String> postUpdate(@AuthenticationPrincipal AuthUser me, @RequestBody UpdateRequest req) {
        eventService.postUpdate(req.eventid(), req.message(), me.id());
        return Map.of("message", "Update posted successfully");
    }

    @PostMapping("/new-schedule")
    public Map<String, String> newSchedule(@AuthenticationPrincipal AuthUser me, @RequestBody NewScheduleRequest req) {
        return Map.of("message", scheduleService.create(req.eventid(), req.title(), req.date(), req.time(),
                req.location(), req.description(), me.id()));
    }

    @PostMapping("/join-event")
    public Map<String, String> join(@AuthenticationPrincipal AuthUser me, @RequestBody JoinEventRequest req) {
        eventService.join(req.eventid(), me.id());
        return Map.of("message", "player added");
    }

    @PostMapping("/match/create")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createMatch(@AuthenticationPrincipal AuthUser me, @RequestBody CreateMatchRequest req) {
        MatchView match = scheduleMatchService.create(req.eventid(), req.scheduleid(), req.stageid(), req.teamA(),
                req.teamB(), req.slotIndex(), req.matchType(), me.id());
        return Map.of("message", "Match created", "match", match);
    }

    @GetMapping("/club/{clubId}")
    public Map<String, Object> clubEvents(@PathVariable String clubId) {
        return eventService.clubEvents(clubId);
    }

    @GetMapping
    public Map<String, Object> myEvents(@AuthenticationPrincipal AuthUser me) {
        return Map.of("events", eventService.eventsOfUser(me.id()));
    }

    @GetMapping("/{eventId}/teams")
    public Map<String, Object> teams(@PathVariable String eventId) {
        return Map.of("teams", eventService.teams(eventId));
    }

    @GetMapping("/{eventId}/schedules")
    public List<ScheduleView> schedules(@PathVariable String eventId) {
        return scheduleService.ofEvent(eventId);
    }

    @GetMapping("/roles/{eventId}")
    public Object roles(@PathVariable String eventId) {
        return eventService.roles(eventId);
    }

    @GetMapping("/{eventId}")
    public Map<String, Object> get(@AuthenticationPrincipal AuthUser me, @PathVariable String eventId) {
        return eventService.get(eventId, me.id());
    }

    // ---------------- private support queries ----------------

    @GetMapping("/{eventId}/queries")
    public Map<String, Object> queries(@AuthenticationPrincipal AuthUser me, @PathVariable String eventId) {
        return Map.of("success", true, "data", queryService.list(eventId, me.id()));
    }

    /** REST fallback when the WebSocket isn't connected. */
    @PostMapping("/{eventId}/queries")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> sendQuery(@AuthenticationPrincipal AuthUser me, @PathVariable String eventId,
                                         @RequestBody QueryRequest req) {
        QueryView view = queryService.send(eventId, me.id(), req.message(), req.targetUser(), req.replyToId());
        return Map.of("success", true, "data", view);
    }

    // ---------------- knockout bracket ----------------

    @PostMapping("/{eventId}/schedule")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> generateBracket(@AuthenticationPrincipal AuthUser me, @PathVariable String eventId) {
        return bracketService.generate(eventId, me.id());
    }

    @PutMapping("/{eventId}/lock-schedule")
    public Map<String, Object> lock(@AuthenticationPrincipal AuthUser me, @PathVariable String eventId) {
        return bracketService.lock(eventId, me.id());
    }

    @GetMapping("/{eventId}/stages")
    public List<StageView> stages(@PathVariable String eventId) {
        return bracketService.stagesOf(eventId);
    }

    @GetMapping("/{eventId}/winner")
    public Map<String, Object> winner(@PathVariable String eventId) {
        return bracketService.winner(eventId);
    }
}
