package org.sys.com.confeccao.controller;

import org.sys.relatorio.RelatorioEstoqueDto;
import org.sys.relatorio.RelatorioQualidadeDto;
import org.sys.relatorio.RelatorioWIPDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/relatorios")
@CrossOrigin(origins = "*")
public class RelatorioController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/wip")
    public ResponseEntity<List<RelatorioWIPDto>> getRelatorioWip() {
        String sql = """
            SELECT
                op.numero_op AS numeroOp,
                ref.codigo AS codigoReferencia,
                ref.descricao AS descricaoPeca,
                op.quantidade_planejada AS quantidadePlanejada,
                op.status AS statusAtualOp,
                op.previsao_entrega AS previsaoEntrega,
                p.razao_social AS ultimoParceiro,
                m.tipo_movimentacao AS ultimaMovimentacao,
                m.data_movimentacao AS dataMovimentacao
            FROM ordens_producao op
            JOIN referencias ref ON op.referencia_id = ref.id
            LEFT JOIN LATERAL (
                SELECT parceiro_id, tipo_movimentacao, data_movimentacao
                FROM movimentacoes_op
                WHERE op_id = op.id
                ORDER BY data_movimentacao DESC
                LIMIT 1
            ) m ON true
            LEFT JOIN parceiros p ON m.parceiro_id = p.id
            ORDER BY op.data_abertura DESC;
       """;

        List<RelatorioWIPDto> resultado = jdbcTemplate.query(sql, new BeanPropertyRowMapper<>(RelatorioWIPDto.class));
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/estoque")
    public ResponseEntity<List<RelatorioEstoqueDto>> getRelatorioEstoque() {
        String sql = """
            SELECT 
                ref.codigo AS codigoReferencia,
                ref.descricao AS peca,
                s.cor,
                s.tamanho,
                SUM(
                    CASE 
                        WHEN m.tipo_movimentacao IN ('RETORNO_LAVANDERIA', 'ENTRADA_ACABAMENTO') THEN im.qtd_aprovada
                        WHEN m.tipo_movimentacao = 'SAIDA_ESTOQUE_FINAL' THEN -im.qtd_aprovada
                        ELSE 0
                    END
                ) AS saldoDisponivel
            FROM itens_movimentacao im
            JOIN movimentacoes_op m ON im.movimentacao_id = m.id
            JOIN skus s ON im.sku_id = s.id
            JOIN referencias ref ON s.referencia_id = ref.id
            GROUP BY ref.codigo, ref.descricao, s.cor, s.tamanho
            HAVING SUM(
                CASE 
                    WHEN m.tipo_movimentacao IN ('RETORNO_LAVANDERIA', 'ENTRADA_ACABAMENTO') THEN im.qtd_aprovada
                    WHEN m.tipo_movimentacao = 'SAIDA_ESTOQUE_FINAL' THEN -im.qtd_aprovada
                    ELSE 0
                END
            ) > 0
            ORDER BY ref.codigo, s.cor, s.tamanho;
        """;

        List<RelatorioEstoqueDto> resultado = jdbcTemplate.query(sql, new BeanPropertyRowMapper<>(RelatorioEstoqueDto.class));
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/qualidade")
    public ResponseEntity<List<RelatorioQualidadeDto>> getRelatorioQualidade() {
        String sql = """
            SELECT 
                COALESCE(p.razao_social, 'Processo Interno') AS parceiro,
                p.tipo AS tipoParceiro,
                SUM(im.qtd_enviada) AS totalEnviado,
                SUM(im.qtd_aprovada) AS totalAprovado,
                SUM(im.qtd_rebolado) AS totalRebolado,
                SUM(im.qtd_segunda_qualidade) AS totalSegundaQualidade,
                ROUND(
                    CASE WHEN SUM(im.qtd_enviada) > 0 
                    THEN (SUM(im.qtd_rebolado)::numeric / SUM(im.qtd_enviada)) * 100 
                    ELSE 0 END, 2
                ) AS taxaConsertoReboladoPct,
                ROUND(
                    CASE WHEN SUM(im.qtd_enviada) > 0 
                    THEN (SUM(im.qtd_segunda_qualidade)::numeric / SUM(im.qtd_enviada)) * 100 
                    ELSE 0 END, 2
                ) AS taxaDefeitoSegundaQualidadePct
            FROM itens_movimentacao im
            JOIN movimentacoes_op m ON im.movimentacao_id = m.id
            LEFT JOIN parceiros p ON m.parceiro_id = p.id
            GROUP BY p.razao_social, p.tipo
            ORDER BY totalEnviado DESC;
        """;

        List<RelatorioQualidadeDto> resultado = jdbcTemplate.query(sql, new BeanPropertyRowMapper<>(RelatorioQualidadeDto.class));
        return ResponseEntity.ok(resultado);
    }
}