package com.venture.sports.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "hello";
    }

    /** Used by hosting platforms (Render, Railway...) to check the app is alive. */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "OK");
    }
}
