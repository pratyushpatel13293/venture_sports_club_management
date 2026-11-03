package com.venture.sports.event;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import com.venture.sports.common.BaseEntity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/** One rule section of an event: a title and its bullet points. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "event_rules")
public class EventRule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(length = 300)
    private String title;

    /** Keeps the rules in the order the admin typed them. */
    private int position;

    @ElementCollection
    @CollectionTable(name = "event_rule_points", joinColumns = @JoinColumn(name = "rule_id"))
    @OrderColumn(name = "point_order")
    @Column(name = "point", length = 1000)
    private List<String> points = new ArrayList<>();
}
