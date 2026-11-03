package com.venture.sports.club;

import com.venture.sports.common.ApiException;
import com.venture.sports.security.AuthUser;
import com.venture.sports.web.Views.ChatView;
import com.venture.sports.web.Views.ClubView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/clubs")
@RequiredArgsConstructor
public class ClubController {

    private final ClubService clubService;

    public record CreateClubRequest(String name, String description) {
    }

    public record JoinClubRequest(String clubId) {
    }

    public record ClubIdRequest(String clubid, String eventid) {
    }

    public record ChatRequest(String message) {
    }

    @PostMapping("/new")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@AuthenticationPrincipal AuthUser me, @RequestBody CreateClubRequest req) {
        ClubView club = clubService.create(req.name(), req.description(), me.id());
        return Map.of("message", "Tournament created successfully", "tournament", club);
    }

    @PostMapping("/join")
    public Map<String, Object> join(@AuthenticationPrincipal AuthUser me, @RequestBody JoinClubRequest req) {
        ClubView club = clubService.join(req.clubId(), me.id());
        return Map.of("message", "Joined tournament successfully", "tournament", club);
    }

    @GetMapping("/my-admin")
    public Map<String, Object> myAdmin(@AuthenticationPrincipal AuthUser me) {
        return Map.of("tournaments", clubService.clubsAdministeredBy(me.id()));
    }

    @GetMapping("/participant")
    public Map<String, Object> participant(@AuthenticationPrincipal AuthUser me) {
        return Map.of("tournaments", clubService.clubsOfMember(me.id()));
    }

    @GetMapping("/{clubId}/chat")
    public Map<String, Object> chat(@PathVariable String clubId,
                                    @RequestParam(defaultValue = "1") int page,
                                    @RequestParam(defaultValue = "50") int limit) {
        return Map.of("success", true, "data", clubService.chatHistory(clubId, page, limit),
                "page", page, "limit", limit);
    }

    @PostMapping("/{clubId}/chat")
    public Map<String, Object> postChat(@AuthenticationPrincipal AuthUser me, @PathVariable String clubId,
                                        @RequestBody ChatRequest req) {
        ChatView view = clubService.postAnnouncement(clubId, me.id(), req.message());
        return Map.of("success", true, "data", view);
    }

    @GetMapping("/{clubId}")
    public Map<String, Object> get(@PathVariable String clubId) {
        return Map.of("success", true, "club", clubService.get(clubId));
    }

    @PostMapping("/leave")
    public Map<String, String> leave(@AuthenticationPrincipal AuthUser me, @RequestBody ClubIdRequest req) {
        clubService.leave(req.clubid(), me.id());
        return Map.of("message", "Successfully left the club");
    }

    /**
     * Body {clubid} deletes a whole club (club admin only).
     * Body {eventid} deletes one event (event admin/manager), like the old Node route.
     */
    @DeleteMapping("/delete")
    public Map<String, String> delete(@AuthenticationPrincipal AuthUser me, @RequestBody ClubIdRequest req) {
        if (req.clubid() != null && !req.clubid().isBlank()) {
            clubService.deleteClub(req.clubid(), me.id());
            return Map.of("message", "Club deleted successfully");
        }
        if (req.eventid() != null && !req.eventid().isBlank()) {
            clubService.deleteEvent(req.eventid(), me.id());
            return Map.of("message", "Event deleted successfully");
        }
        throw ApiException.badRequest("clubid or eventid is required");
    }
}
