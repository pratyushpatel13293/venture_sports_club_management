package com.venture.sports.team;

import com.venture.sports.security.AuthUser;
import com.venture.sports.web.Views.TeamView;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    public record NewTeamRequest(String teamname, String eventid) {
    }

    public record TeamUserRequest(String teamid, String userid) {
    }

    public record TeamIdRequest(String teamid) {
    }

    public record RenameRequest(String teamid, String name) {
    }

    public record NotificationRequest(String notificationId) {
    }

    @GetMapping("/team/notifications")
    public Map<String, Object> notifications(@AuthenticationPrincipal AuthUser me) {
        return Map.of("notifications", teamService.inbox(me.id()));
    }

    @GetMapping("/team/{teamId}")
    public TeamView team(@PathVariable String teamId) {
        return teamService.get(teamId);
    }

    @GetMapping("/{eventId}")
    public List<TeamView> teamsOfEvent(@PathVariable String eventId) {
        return teamService.teamsOfEvent(eventId);
    }

    @PostMapping("/new-team")
    public Map<String, String> create(@AuthenticationPrincipal AuthUser me, @RequestBody NewTeamRequest req) {
        teamService.create(req.teamname(), req.eventid(), me.id());
        return Map.of("message", "new team created");
    }

    @PostMapping("/invite")
    public Map<String, String> invite(@AuthenticationPrincipal AuthUser me, @RequestBody TeamUserRequest req) {
        teamService.invite(req.teamid(), req.userid(), me.id());
        return Map.of("message", "Join invite sent!");
    }

    @PostMapping("/team/accept-request")
    public Map<String, String> accept(@AuthenticationPrincipal AuthUser me, @RequestBody NotificationRequest req) {
        teamService.acceptInvite(req.notificationId(), me.id());
        return Map.of("message", "Joined team successfully");
    }

    @PostMapping("/team/reject-request")
    public Map<String, String> reject(@AuthenticationPrincipal AuthUser me, @RequestBody NotificationRequest req) {
        teamService.rejectInvite(req.notificationId(), me.id());
        return Map.of("message", "Request rejected");
    }

    @PutMapping("/edit")
    public Map<String, String> rename(@AuthenticationPrincipal AuthUser me, @RequestBody RenameRequest req) {
        teamService.rename(req.teamid(), req.name(), me.id());
        return Map.of("message", "Team name changed");
    }

    @PostMapping("/remove")
    public Map<String, String> remove(@AuthenticationPrincipal AuthUser me, @RequestBody TeamUserRequest req) {
        teamService.removeMember(req.teamid(), req.userid(), me.id());
        return Map.of("message", "User removed from team");
    }

    @PostMapping("/leave")
    public Map<String, String> leave(@AuthenticationPrincipal AuthUser me, @RequestBody TeamIdRequest req) {
        teamService.leave(req.teamid(), me.id());
        return Map.of("message", "You have left the team successfully");
    }

    @PostMapping("/make-admin")
    public Map<String, String> makeAdmin(@AuthenticationPrincipal AuthUser me, @RequestBody TeamUserRequest req) {
        teamService.transferLeadership(req.teamid(), req.userid(), me.id());
        return Map.of("message", "Admin role transferred successfully");
    }

    @PostMapping("/dismantle")
    public Map<String, String> dismantle(@AuthenticationPrincipal AuthUser me, @RequestBody TeamIdRequest req) {
        teamService.dismantle(req.teamid(), me.id());
        return Map.of("message", "Team dismantled successfully");
    }

    @PostMapping("/register")
    public Map<String, String> register(@AuthenticationPrincipal AuthUser me, @RequestBody TeamIdRequest req) {
        teamService.register(req.teamid(), me.id());
        return Map.of("message", "Team registered");
    }
}
