package com.venture.sports.team;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.Event;
import com.venture.sports.event.EventDeletionService;
import com.venture.sports.user.Notification;
import com.venture.sports.user.NotificationRepository;
import com.venture.sports.user.User;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.Views.InboxNotification;
import com.venture.sports.web.Views.TeamView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Team life cycle:
 *
 *   create (leader) ─> invite ─> player accepts from inbox ─> leader registers the team
 *
 * Rules enforced here:
 *   - one team per player per event
 *   - only the leader invites / removes / renames / registers / dismantles
 *   - gender restriction of the event ("Male"/"Female" only events)
 *   - team size limit (event.maxPlayer)
 */
@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teams;
    private final NotificationRepository notifications;
    private final EventDeletionService deletion;
    private final Finder finder;
    private final ViewMapper mapper;

    @Transactional(readOnly = true)
    public List<InboxNotification> inbox(String userId) {
        return notifications.findByUserIdOrderByCreatedAtDesc(userId).stream().map(mapper::inbox).toList();
    }

    @Transactional(readOnly = true)
    public TeamView get(String teamId) {
        return mapper.teamPopulated(finder.team(teamId), true);
    }

    @Transactional(readOnly = true)
    public List<TeamView> teamsOfEvent(String eventId) {
        finder.event(eventId);
        return teams.findByEventIdOrderByCreatedAtAsc(eventId).stream()
                .map(t -> mapper.teamPopulated(t, false)).toList();
    }

    @Transactional
    public void create(String teamname, String eventId, String userId) {
        if (teamname == null || teamname.isBlank()) throw ApiException.badRequest("Team name is required");
        Event event = finder.event(eventId);
        User leader = finder.user(userId);

        if ("admin".equalsIgnoreCase(event.getTeamsBy()) && !event.isStaff(userId)) {
            throw ApiException.forbidden("Only event admins can create teams in this event");
        }
        checkGender(event, leader);
        if (teams.findTeamOfMember(eventId, userId).isPresent()) {
            throw ApiException.badRequest("You are already part of a team in this event");
        }

        Team team = new Team();
        team.setTeamname(teamname.trim());
        team.setLeader(leader);
        team.getMembers().add(leader);
        team.setEvent(event);
        teams.save(team);
        event.getTeams().add(team);
        event.getParticipants().add(leader);
    }

    @Transactional
    public void invite(String teamId, String invitedUserId, String leaderId) {
        Team team = finder.team(teamId);
        if (!team.isLeader(leaderId)) throw ApiException.forbidden("Only leader can invite");
        if (team.isRegistered()) throw ApiException.badRequest("Team is already registered");

        User user = finder.user(invitedUserId);
        Event event = team.getEvent();
        checkGender(event, user);

        if (team.hasMember(user.getId())) throw ApiException.badRequest("User already a member");
        if (team.getRequests().stream().anyMatch(r -> r.getUser().getId().equals(user.getId()))) {
            throw ApiException.badRequest("Already invited");
        }
        if (teams.findTeamOfMember(event.getId(), user.getId()).isPresent()) {
            throw ApiException.badRequest("User is already part of another team in this event");
        }
        if (team.getMembers().size() >= event.getMaxPlayer()) throw ApiException.badRequest("Team is full");

        TeamRequest request = new TeamRequest();
        request.setTeam(team);
        request.setUser(user);
        team.getRequests().add(request);

        Notification n = new Notification();
        n.setUser(user);
        n.setRequester(team.getLeader());
        n.setTeam(team);
        n.setMessage("You were invited to join team \"" + team.getTeamname() + "\"");
        notifications.save(n);
    }

    @Transactional
    public void acceptInvite(String notificationId, String userId) {
        Notification note = notifications.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> ApiException.notFound("Notification not found"));
        Team team = note.getTeam();
        if (team == null) throw ApiException.notFound("Team not found");
        Event event = team.getEvent();
        User user = note.getUser();

        // Check BEFORE adding (the Node version added first, then checked).
        if (!team.hasMember(userId)) {
            if (teams.findTeamOfMember(event.getId(), userId).isPresent()) {
                throw ApiException.badRequest("You already joined another team in this event");
            }
            if (team.getMembers().size() >= event.getMaxPlayer()) throw ApiException.badRequest("Team is full");
            team.getMembers().add(user);
        }
        team.getRequests().removeIf(r -> r.getUser().getId().equals(userId));
        event.getParticipants().add(user);
        event.getClub().getMembers().add(user);
        notifications.delete(note);
    }

    @Transactional
    public void rejectInvite(String notificationId, String userId) {
        Notification note = notifications.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> ApiException.notFound("Notification not found"));
        if (note.getTeam() != null) {
            note.getTeam().getRequests().removeIf(r -> r.getUser().getId().equals(userId));
        }
        notifications.delete(note);
    }

    @Transactional
    public void rename(String teamId, String newName, String userId) {
        Team team = finder.team(teamId);
        if (!team.isLeader(userId)) throw ApiException.forbidden("Only leader can edit team settings");
        if (newName == null || newName.isBlank()) throw ApiException.badRequest("Team name is required");
        team.setTeamname(newName.trim());
    }

    @Transactional
    public void removeMember(String teamId, String memberId, String leaderId) {
        Team team = finder.team(teamId);
        if (!team.isLeader(leaderId)) throw ApiException.forbidden("Only leader can remove");
        if (leaderId.equals(memberId)) throw ApiException.badRequest("Leader cannot remove himself");
        if (!team.hasMember(memberId)) throw ApiException.badRequest("User is not in team");
        team.getMembers().removeIf(u -> u.getId().equals(memberId));
        team.getEvent().getParticipants().removeIf(u -> u.getId().equals(memberId));
    }

    @Transactional
    public void leave(String teamId, String userId) {
        Team team = finder.team(teamId);
        if (team.isLeader(userId)) {
            throw ApiException.badRequest("Leader cannot leave team. Transfer leadership or delete team.");
        }
        if (!team.hasMember(userId)) throw ApiException.badRequest("You are not a member of this team");
        team.getMembers().removeIf(u -> u.getId().equals(userId));
        team.getEvent().getParticipants().removeIf(u -> u.getId().equals(userId));
    }

    /** Leadership moves to another member; the old leader stays in the team as a normal member. */
    @Transactional
    public void transferLeadership(String teamId, String newLeaderId, String leaderId) {
        Team team = finder.team(teamId);
        if (!team.isLeader(leaderId)) throw ApiException.forbidden("Only leader can assign admin");
        if (leaderId.equals(newLeaderId)) throw ApiException.badRequest("You are already the admin");
        User newLeader = team.getMembers().stream().filter(u -> u.getId().equals(newLeaderId)).findFirst()
                .orElseThrow(() -> ApiException.badRequest("User is not a team member"));
        team.setLeader(newLeader);
    }

    @Transactional
    public void dismantle(String teamId, String leaderId) {
        Team team = finder.team(teamId);
        if (!team.isLeader(leaderId)) throw ApiException.forbidden("Only team leader can dismantle team");
        Event event = team.getEvent();
        team.getMembers().forEach(m -> event.getParticipants().removeIf(p -> p.getId().equals(m.getId())));
        deletion.deleteTeam(team);
    }

    @Transactional
    public void register(String teamId, String leaderId) {
        Team team = finder.team(teamId);
        if (!team.isLeader(leaderId)) throw ApiException.forbidden("Only team leader can register team");
        Event event = team.getEvent();
        if (team.getMembers().size() < event.getMinPlayer()) {
            throw ApiException.badRequest("Team needs at least " + event.getMinPlayer() + " players");
        }
        team.setRegistered(true);
    }

    /** "Male" / "Female" events only accept that gender. "Mixed"/"None" accept everyone. */
    private static void checkGender(Event event, User user) {
        String restriction = event.getGenderRestriction();
        if ("Male".equalsIgnoreCase(restriction) || "Female".equalsIgnoreCase(restriction)) {
            if (user.getGender() == null || !restriction.equalsIgnoreCase(user.getGender())) {
                throw ApiException.forbidden("Only " + restriction + " players are allowed in this event");
            }
        }
    }
}
