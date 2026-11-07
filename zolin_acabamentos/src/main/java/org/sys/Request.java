package org.sys;
import lombok.Data;
import java.util.List;

public class Request {

    @Data
    public class MovimentacaoRequestDTO {
        private Integer opId;
        private Integer parceiroId;
        private String tipoMovimentacao;
        private String numeroNotaRemessa;
        private String observacoes;
        private List<ItemMovimentacaoDTO> itens;
    }

    @Data
    class ItemMovimentacaoDTO {
        private Integer skuId;
        private Integer qtdEnviada;
        private Integer qtdAprovada;
        private Integer qtdRebolado;
        private Integer qtdSegundaQualidade;
    }
}
