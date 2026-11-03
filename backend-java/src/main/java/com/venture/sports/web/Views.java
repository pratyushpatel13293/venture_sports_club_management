package com.venture.sports.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.venture.sports.match.MatchStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * DTOs (Data Transfer Objects): the exact JSON shapes the React app expects.
 *
 * Why not return the @Entity classes directly?
 *  1. Entities contain things the client must never see (password hash, refresh-token hash).
 *  2. Lazy JPA relations would either crash during JSON writing or fire hundreds of queries.
 *  3. The frontend was written for MongoDB, so it expects "_id" and sometimes an id string,
 *     sometimes a nested object ("populated"). DTOs let us shape each response on purpose.
 *
 * Fields typed as Object hold either an id (String) or a nested DTO, mirroring
 * Mongoose's populate() behaviour for that endpoint.
 */
public final class Views {

    private Views() {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record UserRef(
            @JsonProperty("_id") String id,
            String username,
            String name,
            String email,
            String gender) {
    }

    public record MeView(
            @JsonProperty("_id") String id,
            String username,
            String name,
            String email,
            @JsonProperty("roll_number") String rollNumber,
            String gender,
            @JsonProperty("isVerified") boolean verified,
            List<String> clubs,
            List<String> events,
            Instant createdAt,
            Instant updatedAt) {
    }

    /** The small user object returned by signup/login (note: "id", not "_id"). */
    public record LoginUser(String id, String username, String name, String email) {
    }

    public record ClubView(
            @JsonProperty("_id") String id,
            String name,
            String description,
            String admin,
            List<String> managers,
            List<String> events,
            List<String> users,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record RuleView(@JsonProperty("_id") String id, String title, List<String> points) {
    }

    public record UpdateView(@JsonProperty("_id") String id, String message, String createdBy, Instant createdAt) {
    }

    public record EventView(
            @JsonProperty("_id") String id,
            String name,
            String description,
            @JsonProperty("admin") List<String> admins,
            List<String> managers,
            List<String> schedules,
            List<String> users,
            String club,
            String teamsBy,
            @JsonProperty("imgURL") String imgUrl,
            @JsonProperty("Sport") String sport,
            @JsonProperty("genderres") String genderRestriction,
            @JsonProperty("maxmale") Integer maxMale,
            @JsonProperty("maxfemale") Integer maxFemale,
            List<RuleView> rules,
            String status,
            List<UpdateView> updates,
            Integer minPlayer,
            Integer maxPlayer,
            List<Object> teams,
            @JsonProperty("isScheduleLocked") boolean scheduleLocked,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record TeamRequestView(@JsonProperty("_id") String id, Object user, Instant requestedAt) {
    }

    public record TeamView(
            @JsonProperty("_id") String id,
            String teamname,
            Object leader,
            List<Object> members,
            List<TeamRequestView> requests,
            List<String> invitedEmails,
            String eventid,
            @JsonProperty("isRegistered") boolean registered,
            Instant createdAt,
            Instant updatedAt) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TeamName(@JsonProperty("_id") String id, String teamname, List<String> members) {
    }

    public record ScheduleView(
            @JsonProperty("_id") String id,
            String title,
            LocalDate date,
            String time,
            String location,
            String description,
            String eventid,
            List<Object> matches,
            List<Object> qualifiedTeams,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record SideView(Object teamId, boolean autoAdvanced) {
    }

    public record RoundView(
            @JsonProperty("_id") String id,
            int roundNo,
            @JsonProperty("teamA_score") int teamAScore,
            @JsonProperty("teamB_score") int teamBScore,
            String winner,
            @JsonProperty("isCompleted") boolean completed) {
    }

    public record MatchView(
            @JsonProperty("_id") String id,
            String eventid,
            String scheduleid,
            String stageid,
            int slotIndex,
            String matchType,
            MatchStatus status,
            SideView teamA,
            SideView teamB,
            String nextMatchId,
            String nextSlot,
            Object winner,
            @JsonProperty("isDraw") boolean draw,
            String decidedBy,
            List<RoundView> rounds,
            int currentRound,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record StageView(
            @JsonProperty("_id") String id,
            String eventid,
            String name,
            String type,
            int order,
            List<String> teams,
            List<MatchView> matches,
            String scheduleid,
            String status,
            Instant createdAt,
            Instant updatedAt) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ChatView(
            @JsonProperty("_id") String id,
            String clubId,
            String eventId,
            String text,
            String message,
            UserRef sender,
            String senderRole,
            Instant createdAt) {
    }

    public record QueryView(
            @JsonProperty("_id") String id,
            String eventId,
            UserRef sender,
            String senderRole,
            String message,
            String visibility,
            String targetUser,
            String replyTo,
            Instant createdAt,
            Instant updatedAt) {
    }

    /** Raw notification (GET /notifications). */
    public record NotificationView(
            @JsonProperty("_id") String id,
            String message,
            String requser,
            String teamid,
            Instant createdAt) {
    }

    /** Inbox notification (GET /teams/team/notifications). */
    public record InboxNotification(
            String id,
            String message,
            String userName,
            String teamName,
            String requser,
            String teamid,
            Instant createdAt) {
    }
}
