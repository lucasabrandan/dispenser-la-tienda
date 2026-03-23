-- Crear tabla VENTA
CREATE TABLE venta (
                       id SERIAL PRIMARY KEY,
                       cliente_id BIGINT NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
                       fecha DATE NOT NULL,
                       subtotal_costo DECIMAL(10, 2) NOT NULL DEFAULT 0,
                       subtotal_venta DECIMAL(10, 2) NOT NULL DEFAULT 0,
                       descuento_porcentaje DECIMAL(5, 2) DEFAULT 0,
                       descuento_monto DECIMAL(10, 2) DEFAULT 0,
                       iva DECIMAL(10, 2) DEFAULT 0,
                       total_ingreso DECIMAL(10, 2) NOT NULL DEFAULT 0,
                       ganancia_real DECIMAL(10, 2) NOT NULL DEFAULT 0,
                       estado VARCHAR(20) DEFAULT 'CONFIRMADA',
                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP,
                       active BOOLEAN DEFAULT true,
                       observaciones VARCHAR(500),
                       CONSTRAINT chk_estado_venta CHECK (estado IN ('CONFIRMADA', 'PAGADA', 'CANCELADA')),
                       CONSTRAINT chk_cantidad_positiva CHECK (subtotal_costo >= 0 AND subtotal_venta >= 0)
);

-- Crear tabla VENTA_ITEMS
CREATE TABLE venta_items (
                             id SERIAL PRIMARY KEY,
                             venta_id BIGINT NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
                             descripcion VARCHAR(255) NOT NULL,
                             cantidad INT NOT NULL CHECK (cantidad > 0),
                             costo_unitario DECIMAL(10, 2) NOT NULL,
                             precio_lista_unitario DECIMAL(10, 2) NOT NULL,
                             precio_aplicado_unitario DECIMAL(10, 2) NOT NULL,
                             ganancia_unitaria DECIMAL(10, 2) NOT NULL DEFAULT 0,
                             subtotal_costo DECIMAL(10, 2) NOT NULL DEFAULT 0,
                             subtotal_venta DECIMAL(10, 2) NOT NULL DEFAULT 0,
                             ganancia_total_item DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- Índices para performance
CREATE INDEX idx_venta_cliente_id ON venta(cliente_id);
CREATE INDEX idx_venta_fecha ON venta(fecha);
CREATE INDEX idx_venta_estado ON venta(estado);
CREATE INDEX idx_venta_created_at ON venta(created_at);
CREATE INDEX idx_venta_items_venta_id ON venta_items(venta_id);