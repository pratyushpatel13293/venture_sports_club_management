package com.venture.sports.user;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data writes the SQL for these methods from their names at startup
 * (findByEmail -> SELECT * FROM users WHERE email = ?).
 */
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    @Query("""
            SELECT u FROM User u
            WHERE lower(u.username) LIKE lower(concat('%', :q, '%'))
               OR lower(u.email)    LIKE lower(concat('%', :q, '%'))
               OR lower(u.name)     LIKE lower(concat('%', :q, '%'))
            ORDER BY u.username
            """)
    List<User> search(@Param("q") String q, Pageable pageable);
}
