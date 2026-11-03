package com.venture.sports.event;

import com.venture.sports.club.Club;
import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.EventDtos.CreateEventRequest;
import com.venture.sports.event.EventDtos.EditEventRequest;
import com.venture.sports.event.EventDtos.RuleInput;
import com.venture.sports.user.User;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.Views.EventView;
import com.venture.sports.web.Views.TeamView;
import com.venture.sports.web.Views.UserRef;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class EventService {

    private static final int MAX_ADMINS = 2;

    private final EventRepository events;
    private final Finder finder;
    private final ViewMapper mapper;

    /** Club admin or club manager creates an event and becomes its first admin. */
    @Transactional
    public String create(CreateEventRequest req, String userId) {
        Club club = finder.club(req.clubid());
        if (!club.isAdmin(userId) && !club.isManager(userId)) {
            throw ApiException.forbidden("Only the club admin or managers can create events");
        }
        if (req.name() == null || req.name().isBlank()) throw ApiException.badRequest("Event name required");
        if (req.maxPlayer() == null || req.maxPlayer() < 1) throw ApiException.badRequest("maxPlayer must be at least 1");

        User creator = finder.user(userId);
        Event event = new Event();
        event.setName(req.name().trim());
        event.setDescription(req.description());
        event.setClub(club);
        event.setMaxPlayer(req.maxPlayer());
        event.setStatus(req.status());
        event.setTeamsBy(req.teamc() == null ? "users" : req.teamc());
        event.getAdmins().add(creator);
        event.getParticipants().add(creator);
        events.save(event);
        club.getEvents().add(event);
        return event.getId();
    }

    /**
     * Only an event admin can promote someone. post = "admin" (max 2) or "manager".
     * The promoted user also joins the club and the event.
     */
    @Transactional
    public String promote(String eventId, String targetUserId, String post, String actorId) {
        Event event = finder.event(eventId);
        if (!event.isAdmin(actorId)) throw ApiException.forbidden("Only event admins can promote users");
        User target = finder.user(targetUserId);

        event.getClub().getMembers().add(target);
        event.getParticipants().add(target);

        if ("admin".equalsIgnoreCase(post)) {
            if (event.isAdmin(target.getId())) throw ApiException.badRequest("User is already an admin");
            if (event.getAdmins().size() >= MAX_ADMINS) throw ApiException.badRequest("Can't make more than 2 admins");
            event.getManagers().remove(target);
            event.getAdmins().add(target);
            return "new admin created";
        }
        if (event.isManager(target.getId())) throw ApiException.badRequest("User is already a manager");
        if (event.isAdmin(target.getId())) throw ApiException.badRequest("User is already an admin");
        event.getManagers().add(target);
        return "new manager created";
    }

    @Transactional
    public void postUpdate(String eventId, String message, String actorId) {
        Event event = finder.event(eventId);
        requireStaff(event, actorId);
        if (message == null || message.isBlank()) throw ApiException.badRequest("Message required");
        EventUpdate update = new EventUpdate();
        update.setEvent(event);
        update.setMessage(message.trim());
        update.setCreatedBy(finder.user(actorId));
        event.getUpdates().add(update);
    }

    @Transactional
    public void join(String eventId, String userId) {
        Event event = finder.event(eventId);
        if (event.getParticipants().stream().anyMatch(u -> u.getId().equals(userId))) {
            throw ApiException.badRequest("player already in event");
        }
        event.getParticipants().add(finder.user(userId));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> clubEvents(String clubId) {
        Club club = finder.club(clubId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("club", club.getName());
        body.put("events", club.getEvents().stream().map(e -> mapper.event(e, false)).toList());
        return body;
    }

    @Transactional(readOnly = true)
    public List<EventView> eventsOfUser(String userId) {
        return events.findEventsOfUser(userId).stream().map(e -> mapper.event(e, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<TeamView> teams(String eventId) {
        return finder.event(eventId).getTeams().stream().map(mapper::teamShallow).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, List<UserRef>> roles(String eventId) {
        Event event = finder.event(eventId);
        return Map.of(
                "admins", event.getAdmins().stream().map(mapper::userRef).toList(),
                "managers", event.getManagers().stream().map(mapper::userRef).toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(String eventId, String userId) {
        Event event = finder.event(eventId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("event", mapper.event(event, true));
        body.put("role", event.roleOf(userId));
        return body;
    }

    /** POST /extra/{eventId}/edit-event: only fields that are sent get changed. */
    @Transactional
    public EventView edit(String eventId, EditEventRequest req, String actorId) {
        Event event = finder.event(eventId);
        if (!event.isStaff(actorId)) throw ApiException.forbidden("Only managers/admin allowed");

        if (req.maxPlayer() != null && req.maxPlayer() < 1) {
            throw ApiException.badRequest("Max team size must be at least 1");
        }
        if (req.name() != null && !req.name().isBlank()) event.setName(req.name().trim());
        if (req.description() != null) event.setDescription(req.description());
        if (req.maxPlayer() != null) event.setMaxPlayer(req.maxPlayer());
        if (req.status() != null) event.setStatus(req.status());
        if (req.sport() != null) event.setSport(req.sport());
        if (req.imgUrl() != null) event.setImgUrl(req.imgUrl());
        if (req.teamsBy() != null) event.setTeamsBy(req.teamsBy());
        if (req.genderRestriction() != null) event.setGenderRestriction(req.genderRestriction());
        if (req.maxMale() != null) event.setMaxMale(req.maxMale());
        if (req.maxFemale() != null) event.setMaxFemale(req.maxFemale());
        if (req.rules() != null) replaceRules(event, req.rules());

        events.saveAndFlush(event);   // flush so updatedAt is set in the response
        return mapper.event(event, false);
    }

    private void replaceRules(Event event, List<RuleInput> rules) {
        for (RuleInput rule : rules) {
            boolean hasTitle = rule.title() != null && !rule.title().isBlank();
            boolean hasPoints = rule.points() != null && rule.points().stream().anyMatch(p -> p != null && !p.isBlank());
            if (hasTitle && !hasPoints) throw ApiException.badRequest("Each rule must have at least one point");
        }
        // orphanRemoval = true: rules removed from the list are deleted from the table
        event.getRules().clear();
        int position = 0;
        for (RuleInput input : rules) {
            if (input.title() == null && input.points() == null) continue;
            EventRule rule = new EventRule();
            rule.setEvent(event);
            rule.setTitle(input.title());
            rule.setPosition(position++);
            if (input.points() != null) {
                rule.getPoints().addAll(input.points().stream().filter(Objects::nonNull)
                        .map(String::trim).filter(p -> !p.isEmpty()).toList());
            }
            event.getRules().add(rule);
        }
    }

    @Transactional(readOnly = true)
    public boolean isStaff(String eventId, String userId) {
        return finder.event(eventId).isStaff(userId);
    }

    public static void requireStaff(Event event, String userId) {
        if (!event.isStaff(userId)) throw ApiException.forbidden("Only managers/admin allowed");
    }
}
