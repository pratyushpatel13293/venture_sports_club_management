package com.venture.sports.match;

import com.fasterxml.jackson.annotation.JsonValue;

/** Life cycle of a match: upcoming -> live -> finished. */
public enum MatchStatus {
    UPCOMING("upcoming"),
    LIVE("live"),
    FINISHED("finished");

    private final String value;

    MatchStatus(String value) {
        this.value = value;
    }

    /** The lowercase text the React app expects in JSON. */
    @JsonValue
    public String value() {
        return value;
    }

    public static MatchStatus from(String value) {
        for (MatchStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Unknown match status: " + value);
    }
}
