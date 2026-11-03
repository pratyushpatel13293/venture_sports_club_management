package com.venture.sports.schedule;

import com.venture.sports.common.ApiException;
import com.venture.sports.common.Finder;
import com.venture.sports.event.Event;
import com.venture.sports.event.EventService;
import com.venture.sports.web.ViewMapper;
import com.venture.sports.web.Views.ScheduleView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository schedules;
    private final Finder finder;
    private final ViewMapper mapper;

    /** Admin/manager adds a match day to an event. */
    @Transactional
    public String create(String eventId, String title, String date, String time, String location,
                         String description, String actorId) {
        if (isBlank(title) || isBlank(date) || isBlank(time) || isBlank(location)) {
            throw ApiException.badRequest("Missing fields");
        }
        Event event = finder.event(eventId);
        EventService.requireStaff(event, actorId);

        Schedule schedule = new Schedule();
        schedule.setEvent(event);
        schedule.setTitle(title.trim());
        schedule.setDate(parseDate(date));
        schedule.setTime(time.trim());
        schedule.setLocation(location.trim());
        schedule.setDescription(description);
        schedules.save(schedule);
        event.getSchedules().add(schedule);
        return "New schedule for " + event.getName() + " created";
    }

    @Transactional(readOnly = true)
    public List<ScheduleView> ofEvent(String eventId) {
        finder.event(eventId);
        return schedules.findByEventIdOrderByCreatedAtAsc(eventId).stream()
                .map(s -> mapper.schedule(s, false)).toList();
    }

    /** GET /schedule/{id}: the schedule, its matches, qualified teams, and the caller's role. */
    @Transactional(readOnly = true)
    public Map<String, Object> details(String scheduleId, String userId) {
        Schedule schedule = finder.schedule(scheduleId);
        ScheduleView view = mapper.schedule(schedule, true);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("schedule", view);
        body.put("matches", view.matches());
        body.put("qualified", schedule.getQualifiedTeams().stream().map(mapper::teamShallow).toList());
        body.put("role", schedule.getEvent().roleOf(userId));
        return body;
    }

    /** Accepts "2026-01-05" or an ISO timestamp like "2026-01-05T00:00:00.000Z". */
    private static LocalDate parseDate(String raw) {
        String value = raw.trim();
        try {
            return LocalDate.parse(value.length() >= 10 ? value.substring(0, 10) : value);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("date must look like YYYY-MM-DD");
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
