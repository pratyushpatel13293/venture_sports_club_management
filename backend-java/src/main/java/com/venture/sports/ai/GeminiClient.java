package com.venture.sports.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.venture.sports.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Calls Google's Gemini API to write short commentary text.
 *
 * Optional by design: with no GEMINI_API_KEY, or if the call fails or is slow,
 * we return Optional.empty() and the caller uses its built-in template text.
 * An external API must never be able to break our own endpoint.
 */
@Slf4j
@Component
public class GeminiClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public GeminiClient(AppProperties props) {
        this.apiKey = props.ai().geminiApiKey();
        this.model = props.ai().geminiModel();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        Duration timeout = Duration.ofSeconds(Math.max(1, props.ai().timeoutSeconds()));
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);

        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .requestFactory(factory)
                .build();
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Optional<String> generate(String prompt) {
        if (!isEnabled()) return Optional.empty();
        try {
            Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
            JsonNode response = restClient.post()
                    .uri("/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)   // key in a header, not in the URL (URLs end up in logs)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String text = response == null ? "" : response.path("candidates").path(0)
                    .path("content").path("parts").path(0).path("text").asText("").trim();
            return text.isEmpty() ? Optional.empty() : Optional.of(text);
        } catch (RestClientException | IllegalStateException e) {
            log.warn("Gemini call failed, using fallback text: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
