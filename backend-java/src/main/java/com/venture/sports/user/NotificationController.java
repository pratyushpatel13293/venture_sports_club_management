package com.venture.sports.user;

import com.venture.sports.security.AuthUser;
import com.venture.sports.web.ViewMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notifications;
    private final ViewMapper mapper;

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> list(@AuthenticationPrincipal AuthUser me) {
        return Map.of("notifications",
                notifications.findByUserIdOrderByCreatedAtDesc(me.id()).stream().map(mapper::notification).toList());
    }
}
