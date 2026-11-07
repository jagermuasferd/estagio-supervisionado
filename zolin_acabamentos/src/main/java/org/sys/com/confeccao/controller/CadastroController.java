package org.sys.com.confeccao.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Listas de apoio usadas pelo formulário de movimentação do front-end
 * (escolher a OP, o parceiro e o SKU sem precisar decorar os códigos).
 */
@RestController
@RequestMapping("/api/cadastros")
@CrossOrigin(origins = "*")
public class CadastroController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/ops")
    public ResponseEntity<List<Map<String, Object>>> listarOps() {
        String sql = """
            SELECT
                op.id,
                op.numero_op AS numero,
                ref.codigo AS referencia,
                ref.descricao AS descricao,
                op.status
            FROM ordens_producao op
            JOIN referencias ref ON op.referencia_id = ref.id
            ORDER BY op.data_abertura DESC
        """;
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }

    @GetMapping("/parceiros")
    public ResponseEntity<List<Map<String, Object>>> listarParceiros() {
        String sql = """
            SELECT
                id,
                razao_social AS nome,
                tipo
            FROM parceiros
            ORDER BY razao_social
        """;
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }

    @GetMapping("/skus")
    public ResponseEntity<List<Map<String, Object>>> listarSkus() {
        String sql = """
            SELECT
                s.id,
                ref.codigo AS referencia,
                ref.descricao AS descricao,
                s.cor,
                s.tamanho
            FROM skus s
            JOIN referencias ref ON s.referencia_id = ref.id
            ORDER BY ref.codigo, s.cor, s.tamanho
        """;
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }
}
