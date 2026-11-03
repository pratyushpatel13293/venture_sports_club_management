package com.venture.sports.schedule;

import com.venture.sports.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    public record NewScheduleRequest(String title, String date, String time, String location, String description) {
    }

    @GetMapping("/{scheduleId}")
    public Map<String, Object> get(@AuthenticationPrincipal AuthUser me, @PathVariable String scheduleId) {
        return scheduleService.details(scheduleId, me.id());
    }

    @PostMapping("/{eventId}/new-schedule")
    public Map<String, String> create(@AuthenticationPrincipal AuthUser me, @PathVariable String eventId,
                                      @RequestBody NewScheduleRequest req) {
        String message = scheduleService.create(eventId, req.title(), req.date(), req.time(), req.location(),
                req.description(), me.id());
        return Map.of("message", message);
    }
}
