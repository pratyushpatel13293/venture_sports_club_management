package com.venture.sports.web;

import com.venture.sports.club.ChatMessage;
import com.venture.sports.club.Club;
import com.venture.sports.common.BaseEntity;
import com.venture.sports.event.Event;
import com.venture.sports.event.EventRule;
import com.venture.sports.event.EventUpdate;
import com.venture.sports.event.QueryMessage;
import com.venture.sports.match.Match;
import com.venture.sports.match.MatchRound;
import com.venture.sports.match.MatchSide;
import com.venture.sports.match.Stage;
import com.venture.sports.schedule.Schedule;
import com.venture.sports.team.Team;
import com.venture.sports.team.TeamRequest;
import com.venture.sports.user.Notification;
import com.venture.sports.user.User;
import com.venture.sports.web.Views.*;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.function.Function;

/**
 * Converts entities into the DTOs in {@link Views}.
 * Must be called inside a @Transactional service method, because it walks lazy relations.
 */
@Component
public class ViewMapper {

    /** How much of a team to embed inside a match (the Mongoose populate() select list). */
    public enum TeamDetail { NAME, NAME_AND_MEMBERS, FULL }

    // ---------------------------------------------------------------- helpers

    public static String idOf(BaseEntity entity) {
        return entity == null ? null : entity.getId();
    }

    public static List<String> ids(Collection<? extends BaseEntity> entities) {
        return entities.stream().map(BaseEntity::getId).toList();
    }

    private static <T> List<Object> mapAll(Collection<T> items, Function<T, Object> fn) {
        return items.stream().map(fn).toList();
    }

    // ---------------------------------------------------------------- users

    public UserRef userRef(User u) {
        return u == null ? null : new UserRef(u.getId(), u.getUsername(), u.getName(), u.getEmail(), null);
    }

    public UserRef userRefWithGender(User u) {
        return u == null ? null : new UserRef(u.getId(), u.getUsername(), u.getName(), u.getEmail(), u.getGender());
    }

    /** {_id, username, name} - what the chat screens show. */
    public UserRef sender(User u) {
        return u == null ? null : new UserRef(u.getId(), u.getUsername(), u.getName(), null, null);
    }

    public LoginUser loginUser(User u) {
        return new LoginUser(u.getId(), u.getUsername(), u.getName(), u.getEmail());
    }

    public MeView me(User u, List<String> clubIds, List<String> eventIds) {
        return new MeView(u.getId(), u.getUsername(), u.getName(), u.getEmail(), u.getRollNumber(),
                u.getGender(), u.isVerified(), clubIds, eventIds, u.getCreatedAt(), u.getUpdatedAt());
    }

    // ---------------------------------------------------------------- clubs

    public ClubView club(Club c) {
        return new ClubView(c.getId(), c.getName(), c.getDescription(), idOf(c.getAdmin()),
                ids(c.getManagers()), ids(c.getEvents()), ids(c.getMembers()),
                c.getCreatedAt(), c.getUpdatedAt());
    }

    public ChatView chat(ChatMessage m) {
        return new ChatView(m.getId(), idOf(m.getClub()), idOf(m.getEvent()), m.getText(), m.getText(),
                sender(m.getSender()), m.getSenderRole(), m.getCreatedAt());
    }

    // ---------------------------------------------------------------- events

    /** @param populateTeams true -> teams as objects, false -> team ids */
    public EventView event(Event e, boolean populateTeams) {
        List<Object> teams = populateTeams
                ? mapAll(e.getTeams(), this::teamShallow)
                : mapAll(e.getTeams(), BaseEntity::getId);
        return new EventView(
                e.getId(), e.getName(), e.getDescription(),
                ids(e.getAdmins()), ids(e.getManagers()), ids(e.getSchedules()), ids(e.getParticipants()),
                idOf(e.getClub()), e.getTeamsBy(), e.getImgUrl(), e.getSport(), e.getGenderRestriction(),
                e.getMaxMale(), e.getMaxFemale(),
                e.getRules().stream().map(this::rule).toList(),
                e.getStatus(),
                e.getUpdates().stream().map(this::update).toList(),
                e.getMinPlayer(), e.getMaxPlayer(), teams, e.isScheduleLocked(),
                e.getCreatedAt(), e.getUpdatedAt());
    }

    private RuleView rule(EventRule r) {
        return new RuleView(r.getId(), r.getTitle(), List.copyOf(r.getPoints()));
    }

    private UpdateView update(EventUpdate u) {
        return new UpdateView(u.getId(), u.getMessage(), idOf(u.getCreatedBy()), u.getCreatedAt());
    }

    public QueryView query(QueryMessage q) {
        return new QueryView(q.getId(), idOf(q.getEvent()), sender(q.getSender()), q.getSenderRole(),
                q.getMessage(), q.getVisibility(), idOf(q.getTargetUser()), idOf(q.getReplyTo()),
                q.getCreatedAt(), q.getUpdatedAt());
    }

    // ---------------------------------------------------------------- teams

    /** Team with member/leader ids only (like an un-populated Mongo document). */
    public TeamView teamShallow(Team t) {
        return new TeamView(t.getId(), t.getTeamname(), idOf(t.getLeader()),
                mapAll(t.getMembers(), BaseEntity::getId),
                t.getRequests().stream()
                        .map(r -> new TeamRequestView(r.getId(), idOf(r.getUser()), r.getCreatedAt()))
                        .toList(),
                List.copyOf(t.getInvitedEmails()), idOf(t.getEvent()), t.isRegistered(),
                t.getCreatedAt(), t.getUpdatedAt());
    }

    /** Team with leader, members and invited users expanded into user objects. */
    public TeamView teamPopulated(Team t, boolean withGender) {
        Function<User, Object> user = withGender ? this::userRefWithGender : this::userRef;
        return new TeamView(t.getId(), t.getTeamname(), user.apply(t.getLeader()),
                mapAll(t.getMembers(), user),
                t.getRequests().stream().map((TeamRequest r) ->
                        new TeamRequestView(r.getId(), user.apply(r.getUser()), r.getCreatedAt())).toList(),
                List.copyOf(t.getInvitedEmails()), idOf(t.getEvent()), t.isRegistered(),
                t.getCreatedAt(), t.getUpdatedAt());
    }

    public TeamName teamName(Team t) {
        return t == null ? null : new TeamName(t.getId(), t.getTeamname(), null);
    }

    private Object teamFor(Team t, TeamDetail detail) {
        if (t == null) return null;
        return switch (detail) {
            case NAME -> new TeamName(t.getId(), t.getTeamname(), null);
            case NAME_AND_MEMBERS -> new TeamName(t.getId(), t.getTeamname(), ids(t.getMembers()));
            case FULL -> teamShallow(t);
        };
    }

    // ---------------------------------------------------------------- schedules

    public ScheduleView schedule(Schedule s, boolean populateMatches) {
        List<Object> matches = populateMatches
                ? mapAll(s.getMatches(), m -> match(m, TeamDetail.NAME, false))
                : mapAll(s.getMatches(), BaseEntity::getId);
        return new ScheduleView(s.getId(), s.getTitle(), s.getDate(), s.getTime(), s.getLocation(),
                s.getDescription(), idOf(s.getEvent()), matches,
                mapAll(s.getQualifiedTeams(), BaseEntity::getId), s.getCreatedAt(), s.getUpdatedAt());
    }

    // ---------------------------------------------------------------- matches

    /**
     * @param detail          how much of team A / team B to embed
     * @param populateWinner  true -> winner as a team object, false -> winner id
     */
    public MatchView match(Match m, TeamDetail detail, boolean populateWinner) {
        Object winner = populateWinner ? teamFor(m.getWinner(), detail) : idOf(m.getWinner());
        return new MatchView(
                m.getId(), idOf(m.getEvent()), idOf(m.getSchedule()), idOf(m.getStage()),
                m.getSlotIndex(), m.getMatchType(), m.getStatus(),
                side(m.getTeamA(), detail), side(m.getTeamB(), detail),
                idOf(m.getNextMatch()), m.getNextSlot(), winner, m.isDraw(), m.getDecidedBy(),
                m.getRounds().stream().map(this::round).toList(),
                m.getCurrentRound(), m.getCreatedAt(), m.getUpdatedAt());
    }

    private SideView side(MatchSide side, TeamDetail detail) {
        if (side == null) return new SideView(null, false);
        return new SideView(teamFor(side.getTeam(), detail), side.isAutoAdvanced());
    }

    public RoundView round(MatchRound r) {
        return new RoundView(r.getId(), r.getRoundNo(), r.getTeamAScore(), r.getTeamBScore(),
                idOf(r.getWinner()), r.isCompleted());
    }

    public StageView stage(Stage s) {
        return new StageView(s.getId(), idOf(s.getEvent()), s.getName(), s.getType(), s.getStageOrder(),
                ids(s.getTeams()),
                s.getMatches().stream().map(m -> match(m, TeamDetail.NAME, false)).toList(),
                idOf(s.getSchedule()), s.getStatus(), s.getCreatedAt(), s.getUpdatedAt());
    }

    // ---------------------------------------------------------------- notifications

    public NotificationView notification(Notification n) {
        return new NotificationView(n.getId(), n.getMessage(), idOf(n.getRequester()), idOf(n.getTeam()),
                n.getCreatedAt());
    }

    public InboxNotification inbox(Notification n) {
        return new InboxNotification(n.getId(), n.getMessage(),
                n.getRequester() == null ? null : n.getRequester().getName(),
                n.getTeam() == null ? null : n.getTeam().getTeamname(),
                idOf(n.getRequester()), idOf(n.getTeam()), n.getCreatedAt());
    }
}
