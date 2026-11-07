package org.sys.relatorio;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class RelatorioQualidadeDto {
    private String parceiro;
    private String tipoParceiro;
    private Long totalEnviado;
    private Long totalAprovado;
    private Long totalRebolado;
    private Long totalSegundaQualidade;
    private BigDecimal taxaConsertoReboladoPct;
    private BigDecimal taxaDefeitoSegundaQualidadePct;
}