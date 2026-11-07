package org.sys;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;

// Teste de integração: precisa das variáveis DB_URL, DB_USER e DB_PASSWORD definidas
@SpringBootTest(classes = Main.class)
class ConexaoApplicationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void testarConexaoSupabase() {
        String versao = jdbcTemplate.queryForObject("SELECT version();", String.class);

        System.out.println("==========================================");
        System.out.println("SUCESSO! Versão do Banco: " + versao);
        System.out.println("==========================================");

        assertNotNull(versao, "A versão do banco não deveria ser nula!");
    }
}