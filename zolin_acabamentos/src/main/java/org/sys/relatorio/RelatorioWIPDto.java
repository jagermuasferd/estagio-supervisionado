package org.sys.relatorio;

import lombok.Data;
import java.util.Date;

@Data
public class RelatorioWIPDto {
    private String numeroOp;
    private String codigoReferencia;
    private String descricaoPeca;
    private Integer quantidadePlanejada;
    private String statusAtualOp;
    private Date previsaoEntrega;
    private String ultimoParceiro;
    private String ultimaMovimentacao;
    private Date dataMovimentacao;
}