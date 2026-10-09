package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.servicio.DescuentoAlcance;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.dto.servicio.TotalesDTO;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

// ── Cálculo único del total de un servicio (9-oct-2026) ───────────────────────
// Única fuente del total con descuento: lo usan el DTO (vista y PDF), la vista
// previa del formulario, finanzas, liquidación y rendimiento.
//
// Cada ítem guarda:  costo      = total del ítem (mano de obra + repuestos)
//                    costoExtra = mano de obra
// Repuestos del ítem = costo − mano de obra. La mano de obra se acota a [0, costo]
// para que un ítem con datos raros nunca dé repuestos negativos.
//
// El % se aplica solo sobre la suma del alcance elegido. Redondeo HALF_UP a 2 decimales.
public final class CalculoTotales {

    private static final RoundingMode RM = RoundingMode.HALF_UP;
    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    private CalculoTotales() {}

    // Montos mínimos de un ítem para el cálculo
    public record Item(BigDecimal costo, BigDecimal costoExtra) {}

    // Resultado: totales del servicio + el descuento que le toca a cada ítem (mismo orden)
    public record Resultado(TotalesDTO totales, List<BigDecimal> descuentoPorItem) {}

    public static Resultado calcular(List<Item> items, BigDecimal pct, DescuentoAlcance alcance) {
        DescuentoAlcance a = DescuentoAlcance.o(alcance);
        BigDecimal p = pct == null ? BigDecimal.ZERO : pct.max(BigDecimal.ZERO).min(CIEN);

        List<BigDecimal> baseItem = new ArrayList<>();
        BigDecimal mo = BigDecimal.ZERO, rep = BigDecimal.ZERO;
        for (Item it : items) {
            BigDecimal costo = nz(it.costo()).max(BigDecimal.ZERO);
            BigDecimal moItem = nz(it.costoExtra()).max(BigDecimal.ZERO).min(costo);
            BigDecimal repItem = costo.subtract(moItem);
            mo = mo.add(moItem);
            rep = rep.add(repItem);
            baseItem.add(switch (a) {
                case MANO_DE_OBRA -> moItem;
                case REPUESTOS    -> repItem;
                case TOTAL        -> costo;
            });
        }
        mo = mo.setScale(2, RM);
        rep = rep.setScale(2, RM);
        BigDecimal subtotal = mo.add(rep);
        BigDecimal base = switch (a) {
            case MANO_DE_OBRA -> mo;
            case REPUESTOS    -> rep;
            case TOTAL        -> subtotal;
        };
        BigDecimal descuento = base.multiply(p).divide(CIEN, 2, RM);
        BigDecimal total = subtotal.subtract(descuento);

        // Reparto del descuento entre ítems (para el detalle de finanzas): proporcional
        // a la base de cada ítem; el último absorbe la diferencia de redondeo.
        List<BigDecimal> porItem = new ArrayList<>();
        BigDecimal repartido = BigDecimal.ZERO;
        for (int i = 0; i < baseItem.size(); i++) {
            BigDecimal d;
            if (i == baseItem.size() - 1) d = descuento.subtract(repartido);
            else if (base.signum() == 0) d = BigDecimal.ZERO.setScale(2);
            else d = descuento.multiply(baseItem.get(i)).divide(base, 2, RM);
            porItem.add(d);
            repartido = repartido.add(d);
        }

        TotalesDTO t = new TotalesDTO(mo, rep, subtotal, a.name(), p.setScale(2, RM), base, descuento, total);
        return new Resultado(t, porItem);
    }

    public static Resultado de(Servicio s) {
        List<Item> items = s.getItems().stream().map(i -> new Item(i.getCosto(), i.getCostoExtra())).toList();
        return calcular(items, s.getDescuentoPorcentaje(), s.getDescuentoAlcance());
    }

    private static BigDecimal nz(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }
}
