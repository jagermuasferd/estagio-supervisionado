package org.sys.com.confeccao.controller;

import com.confeccao.dto.MovimentacaoRequestDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/movimentacoes")
@CrossOrigin(origins = "*")
public class MovimentacaoController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostMapping
    public ResponseEntity<?> registrarMovimentacao(@RequestBody MovimentacaoRequestDTO request) {
        try {
            // Converte a lista de itens Java para String JSON para o PostgreSQL processar como JSONB
            ObjectMapper objectMapper = new ObjectMapper();
            String itensJson = objectMapper.writeValueAsString(request.getItens());

            // Chamada da função PL/pgSQL que criamos no Supabase
            String sql = "SELECT registrar_movimentacao_op(?, ?, ?, ?, ?, ?::jsonb)";

            Integer movimentacaoId = jdbcTemplate.queryForObject(
                    sql,
                    Integer.class,
                    request.getOpId(),
                    request.getParceiroId(),
                    request.getTipoMovimentacao(),
                    request.getNumeroNotaRemessa(),
                    request.getObservacoes(),
                    itensJson
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "sucesso", true,
                    "mensagem", "Movimentação de OP registrada com sucesso!",
                    "movimentacao_id", movimentacaoId
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "sucesso", false,
                    "erro", e.getMessage()
            ));
        }
    }
}