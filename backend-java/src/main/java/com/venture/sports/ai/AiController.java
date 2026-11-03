package com.venture.sports.ai;

import com.venture.sports.ai.SmartScheduleService.Pairing;
import com.venture.sports.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final PredictionService predictionService;
    private final HighlightsService highlightsService;
    private final SmartScheduleService smartScheduleService;

    public record ApplyRequest(List<Pairing> pairings) {
    }

    @GetMapping("/match/{matchId}/prediction")
    public Map<String, Object> prediction(@PathVariable String matchId) {
        return predictionService.predict(matchId);
    }

    @GetMapping("/match/{matchId}/highlights")
    public Map<String, Object> highlights(@PathVariable String matchId) {
        return highlightsService.highlights(matchId);
    }

    @GetMapping("/schedule/{scheduleId}/smart-schedule")
    public Map<String, Object> suggest(@PathVariable String scheduleId) {
        return smartScheduleService.suggest(scheduleId);
    }

    @PostMapping("/schedule/{scheduleId}/smart-schedule/apply")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> apply(@AuthenticationPrincipal AuthUser me, @PathVariable String scheduleId,
                                     @RequestBody ApplyRequest req) {
        return smartScheduleService.apply(scheduleId, req.pairings(), me.id());
    }
}
