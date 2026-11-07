package org.sys;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;

// Substitua "com.confeccao.SuaClassePrincipal" pelo nome real da classe que tem o método "main" e o @SpringBootApplication
@SpringBootTest(classes = com.confeccao.ConfeccaoApplication.class)
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