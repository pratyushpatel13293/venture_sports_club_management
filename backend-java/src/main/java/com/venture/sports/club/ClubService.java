package com.venture.sports.club;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.Event;
import com.venture.sports.event.EventDeletionService;
import com.venture.sports.realtime.RealtimePublisher;
import com.venture.sports.team.Team;
import com.venture.sports.team.TeamRepository;
import com.venture.sports.user.User;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.Views.ChatView;
import com.venture.sports.web.Views.ClubView;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubService {

    private final ClubRepository clubs;
    private final ChatMessageRepository chats;
    private final TeamRepository teams;
    private final EventDeletionService deletion;
    private final RealtimePublisher realtime;
    private final Finder finder;
    private final ViewMapper mapper;

    /** The creator becomes the club admin and a member. */
    @Transactional
    public ClubView create(String name, String description, String userId) {
        if (name == null || name.isBlank()) throw ApiException.badRequest("name is required");
        User admin = finder.user(userId);
        Club club = new Club();
        club.setName(name.trim());
        club.setDescription(description == null ? "" : description.trim());
        club.setAdmin(admin);
        club.getMembers().add(admin);
        return mapper.club(clubs.save(club));
    }

    @Transactional
    public ClubView join(String clubId, String userId) {
        if (clubId == null || clubId.isBlank()) throw ApiException.badRequest("clubId is required");
        Club club = clubs.findById(clubId.trim()).orElseThrow(() -> ApiException.notFound("Tournament not found"));
        club.getMembers().add(finder.user(userId));
        return mapper.club(club);
    }

    @Transactional(readOnly = true)
    public List<ClubView> clubsAdministeredBy(String userId) {
        return clubs.findByAdminIdOrderByCreatedAtDesc(userId).stream().map(mapper::club).toList();
    }

    @Transactional(readOnly = true)
    public List<ClubView> clubsOfMember(String userId) {
        return clubs.findClubsOfMember(userId).stream().map(mapper::club).toList();
    }

    @Transactional(readOnly = true)
    public ClubView get(String clubId) {
        return mapper.club(finder.club(clubId));
    }

    /** Page 1 = newest messages, returned oldest -> newest for display. */
    @Transactional(readOnly = true)
    public List<ChatView> chatHistory(String clubId, int page, int limit) {
        finder.club(clubId);
        int safeLimit = Math.min(Math.max(limit, 1), 200);
        int safePage = Math.max(page, 1);
        List<ChatView> newestFirst = chats.findByClubIdOrderByCreatedAtDesc(clubId, PageRequest.of(safePage - 1, safeLimit))
                .stream().map(mapper::chat).toList();
        List<ChatView> result = new ArrayList<>(newestFirst);
        java.util.Collections.reverse(result);
        return result;
    }

    /** Only the club admin can post announcements. Used by REST and by the WebSocket handler. */
    @Transactional
    public ChatView postAnnouncement(String clubId, String userId, String text) {
        if (text == null || text.isBlank()) throw ApiException.badRequest("Message required");
        Club club = finder.club(clubId);
        if (!club.isAdmin(userId)) throw ApiException.forbidden("Only club admins can post announcements");

        ChatMessage msg = new ChatMessage();
        msg.setClub(club);
        msg.setSender(finder.user(userId));
        msg.setSenderRole("club-admin");
        msg.setText(text.trim());
        ChatView view = mapper.chat(chats.save(msg));

        realtime.toClub(clubId, "chat:new:club", view);
        return view;
    }

    /**
     * Leaving a club removes the user from the club, from every event of the club,
     * and from those events' teams. Teams the user leads are deleted (if no match uses them yet).
     */
    @Transactional
    public void leave(String clubId, String userId) {
        Club club = finder.club(clubId);
        if (club.isAdmin(userId)) {
            throw ApiException.forbidden("Admin cannot leave the club. Transfer admin role or delete the club.");
        }
        club.getMembers().removeIf(u -> u.getId().equals(userId));
        club.getManagers().removeIf(u -> u.getId().equals(userId));

        List<String> eventIds = new ArrayList<>();
        for (Event event : club.getEvents()) {
            eventIds.add(event.getId());
            event.getAdmins().removeIf(u -> u.getId().equals(userId));
            event.getManagers().removeIf(u -> u.getId().equals(userId));
            event.getParticipants().removeIf(u -> u.getId().equals(userId));
        }
        if (eventIds.isEmpty()) return;

        for (Team team : teams.findTeamsOfMemberInEvents(eventIds, userId)) {
            if (team.isLeader(userId)) {
                deletion.deleteTeam(team);
            } else {
                team.getMembers().removeIf(u -> u.getId().equals(userId));
            }
        }
    }

    /** Club admin deletes the whole club with all its events. */
    @Transactional
    public void deleteClub(String clubId, String userId) {
        Club club = finder.club(clubId);
        if (!club.isAdmin(userId)) throw ApiException.forbidden("Only the club admin can delete the club");
        for (Event event : new ArrayList<>(club.getEvents())) {
            deletion.deleteEventCompletely(event);
        }
        clubs.delete(club);
    }

    /** Event admin/manager deletes one event (what the Node route /clubs/delete did). */
    @Transactional
    public void deleteEvent(String eventId, String userId) {
        Event event = finder.event(eventId);
        if (!event.isStaff(userId)) throw ApiException.forbidden("Not authorized to delete this event");
        deletion.deleteEventCompletely(event);
    }
}
