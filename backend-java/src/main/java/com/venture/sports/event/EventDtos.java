package com.venture.sports.event;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/** Request bodies for /events and /extra endpoints. Field names match what the React app sends. */
public final class EventDtos {

    private EventDtos() {
    }

    public record CreateEventRequest(String clubid, String name, String description, Integer maxPlayer,
                                     String status, String teamc) {
    }

    public record PromoteRequest(String userid, String eventid, String post) {
    }

    public record UpdateRequest(String eventid, String message) {
    }

    public record JoinEventRequest(String eventid, String scheduleid) {
    }

    public record NewScheduleRequest(String eventid, String title, String date, String time,
                                     String location, String description) {
    }

    public record RuleInput(String title, List<String> points) {
    }

    public record EditEventRequest(
            String name,
            String description,
            Integer maxPlayer,
            String status,
            List<RuleInput> rules,
            @JsonProperty("Sport") String sport,
            @JsonProperty("imgURL") String imgUrl,
            String teamsBy,
            @JsonProperty("genderres") String genderRestriction,
            @JsonProperty("maxmale") Integer maxMale,
            @JsonProperty("maxfemale") Integer maxFemale) {
    }

    public record QueryRequest(String message, String targetUser, String replyToId) {
    }
}
