package com.venture.sports.event;

import com.venture.sports.event.EventDtos.EditEventRequest;
import com.venture.sports.security.AuthUser;
import com.venture.sports.web.Views.EventView;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Edit event details (editevent.jsx). Kept at /extra/... so the frontend URL doesn't change. */
@RestController
@RequestMapping("/extra")
@RequiredArgsConstructor
public class ExtraController {

    private final EventService eventService;

    @PostMapping("/{eventId}/edit-event")
    public Map<String, Object> edit(@AuthenticationPrincipal AuthUser me, @PathVariable String eventId,
                                    @RequestBody EditEventRequest req) {
        EventView event = eventService.edit(eventId, req, me.id());
        return Map.of("message", "Event updated successfully", "event", event);
    }
}
