package org.sys.relatorio;

import lombok.Data;

@Data
public class RelatorioEstoqueDto {
    private String codigoReferencia;
    private String peca;
    private String cor;
    private String tamanho;
    private Integer saldoDisponivel;
}