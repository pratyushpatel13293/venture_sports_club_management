package com.venture.sports.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Small helpers so the tests read like the user journey: signup(), post(), get()... */
public abstract class ApiTestBase {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper json;

    public record Session(String id, String token, String refreshToken, String email, String username) {
    }

    protected Session signup(String name, String gender) throws Exception {
        String unique = name.toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String email = unique + "@test.com";
        JsonNode res = post("/auth/signup", null, Map.of(
                "username", unique, "name", name, "email", email,
                "password", "secret123", "gender", gender), 200);
        return new Session(res.path("user").path("id").asText(), res.path("accessToken").asText(),
                res.path("refreshToken").asText(), email, unique);
    }

    protected JsonNode get200(String url, Session s) throws Exception {
        return call(HttpMethod.GET, url, s, null, 200);
    }

    protected JsonNode get(String url, Session s, int expectedStatus) throws Exception {
        return call(HttpMethod.GET, url, s, null, expectedStatus);
    }

    protected JsonNode post(String url, Session s, Object body, int expectedStatus) throws Exception {
        return call(HttpMethod.POST, url, s, body, expectedStatus);
    }

    protected JsonNode put(String url, Session s, Object body, int expectedStatus) throws Exception {
        return call(HttpMethod.PUT, url, s, body, expectedStatus);
    }

    protected JsonNode delete(String url, Session s, Object body, int expectedStatus) throws Exception {
        return call(HttpMethod.DELETE, url, s, body, expectedStatus);
    }

    protected JsonNode call(HttpMethod method, String url, Session s, Object body, int expectedStatus) throws Exception {
        MockHttpServletRequestBuilder req = MockMvcRequestBuilders.request(method, url);
        if (s != null) req.header(HttpHeaders.AUTHORIZATION, "Bearer " + s.token());
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        MvcResult result = mvc.perform(req).andReturn();
        String content = result.getResponse().getContentAsString();
        assertThat(result.getResponse().getStatus())
                .as("%s %s -> %s", method, url, content)
                .isEqualTo(expectedStatus);
        return content.isBlank() ? json.nullNode() : json.readTree(content);
    }
}
