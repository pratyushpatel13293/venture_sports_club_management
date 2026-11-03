package com.venture.sports.match;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores the enum as "upcoming"/"live"/"finished" in MySQL. */
@Converter
public class MatchStatusConverter implements AttributeConverter<MatchStatus, String> {

    @Override
    public String convertToDatabaseColumn(MatchStatus status) {
        return status == null ? null : status.value();
    }

    @Override
    public MatchStatus convertToEntityAttribute(String value) {
        return value == null ? null : MatchStatus.from(value);
    }
}
