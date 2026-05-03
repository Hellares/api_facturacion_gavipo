# API de Integracion para Sistemas Terceros - Syncrofact

> **Version:** 1.0
> **Base URL Beta:** `https://api-beta.syncrofact.net.pe/api`
> **Base URL Produccion:** `https://api.syncrofact.net.pe/api`
> **Autenticacion:** Bearer Token (Laravel Sanctum)

---

## Indice

1. [Autenticacion](#1-autenticacion)
2. [Crear Factura](#2-crear-factura)
3. [Crear Boleta](#3-crear-boleta)
4. [Crear Nota de Credito](#4-crear-nota-de-credito)
5. [Crear Nota de Debito](#5-crear-nota-de-debito)
6. [Crear Guia de Remision](#6-crear-guia-de-remision)
7. [Consultar Documentos](#7-consultar-documentos)
8. [Descargar XML/PDF/CDR](#8-descargar-xmlpdfcdr)
9. [Estados SUNAT](#9-estados-sunat)
10. [Codigos de Referencia](#10-codigos-de-referencia)
11. [Errores Comunes](#11-errores-comunes)
12. [Consultar Series y Correlativos](#12-consultar-series-y-correlativos)
13. [Bancarizacion (Ley N° 28194)](#13-bancarizacion-ley-n-28194)
14. [Formato exacto de items (`detalles[]`)](#14-formato-exacto-de-items-detalles)
15. [Detraccion (SPOT)](#15-detraccion-spot)
16. [Emision asincrona y estados SUNAT](#16-emision-asincrona-y-estados-sunat)
17. [Resiliencia: correlativos y contingencia](#17-resiliencia-correlativos-y-contingencia) (incluye guia de inicio rapido para integradores)
18. [Envio automatico de email al cliente](#18-envio-automatico-de-email-al-cliente)
19. [Comunicaciones de Baja (anulacion)](#19-comunicaciones-de-baja-anulacion)
20. [Anulacion de Boletas (Resumen Diario)](#20-anulacion-de-boletas-resumen-diario)

---

## 1. Autenticacion

### Login

```
POST /auth/login
```

**Request:**
```json
{
  "email": "usuario@empresa.com",
  "password": "tu_password"
}
```

**Response (200):**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": 1,
    "name": "Usuario",
    "email": "usuario@empresa.com",
    "role": "Administrador de Empresa",
    "role_name": "company_admin",
    "company": "MI EMPRESA S.A.C.",
    "permissions": ["invoices.*", "boletas.*", "..."]
  },
  "access_token": "7|sunat_YYocOVbc...",
  "token_type": "Bearer"
}
```

### Uso del Token

Incluir en todas las peticiones:

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Obtener Info del Usuario

```
GET /v1/auth/me
```

---

## 2. Crear Factura

```
POST /v1/invoices
```

### Ejemplo Minimo (precio sin IGV)

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "F001",
  "fecha_emision": "2026-04-13",
  "moneda": "PEN",
  "forma_pago_tipo": "Contado",
  "client": {
    "tipo_documento": "6",
    "numero_documento": "20100039207",
    "razon_social": "RANSA COMERCIAL S.A.",
    "direccion": "AV. ARGENTINA 2833"
  },
  "detalles": [
    {
      "codigo": "001",
      "descripcion": "SERVICIO DE CONSULTORIA",
      "unidad": "ZZ",
      "cantidad": 1,
      "mto_valor_unitario": 100.00,
      "tip_afe_igv": "10"
    }
  ]
}
```

### Ejemplo con precio CON IGV (modo retail)

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "F001",
  "fecha_emision": "2026-04-13",
  "moneda": "PEN",
  "forma_pago_tipo": "Contado",
  "client": {
    "tipo_documento": "6",
    "numero_documento": "20100039207",
    "razon_social": "RANSA COMERCIAL S.A.",
    "direccion": "AV. ARGENTINA 2833"
  },
  "detalles": [
    {
      "codigo": "PROD-001",
      "descripcion": "LAPTOP HP PAVILION 15",
      "unidad": "NIU",
      "cantidad": 2,
      "mto_precio_unitario": 3540.00,
      "tip_afe_igv": "10"
    },
    {
      "codigo": "SERV-001",
      "descripcion": "INSTALACION Y CONFIGURACION",
      "unidad": "ZZ",
      "cantidad": 1,
      "mto_valor_unitario": 200.00,
      "tip_afe_igv": "10"
    }
  ]
}
```

### Ejemplo con Credito (cuotas)

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "F001",
  "fecha_emision": "2026-04-13",
  "moneda": "PEN",
  "forma_pago_tipo": "Credito",
  "forma_pago_cuotas": [
    {
      "moneda": "PEN",
      "monto": 1770.00,
      "fecha_pago": "2026-05-13"
    },
    {
      "moneda": "PEN",
      "monto": 1770.00,
      "fecha_pago": "2026-06-13"
    }
  ],
  "client": {
    "tipo_documento": "6",
    "numero_documento": "20100039207",
    "razon_social": "RANSA COMERCIAL S.A."
  },
  "detalles": [
    {
      "codigo": "001",
      "descripcion": "SERVICIO MENSUAL",
      "unidad": "ZZ",
      "cantidad": 1,
      "mto_valor_unitario": 3000.00,
      "tip_afe_igv": "10"
    }
  ]
}
```

### Campos de Factura

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `company_id` | integer | Si | ID de la empresa |
| `branch_id` | integer | Si | ID de la sucursal |
| `serie` | string(4) | Si | Serie (F001, F002...) |
| `fecha_emision` | date | Si | Fecha de emision (YYYY-MM-DD) |
| `moneda` | string | Si | "PEN" o "USD" |
| `forma_pago_tipo` | string | Si | "Contado" o "Credito" |
| `tipo_operacion` | string(4) | No | Default: "0101" (venta interna) |
| `fecha_vencimiento` | date | No | Fecha de vencimiento |
| `forma_pago_cuotas` | array | Si (si Credito) | Cuotas de pago |
| `observaciones` | string | No | Observaciones |
| `usuario_creacion` | string | No | Usuario que crea |

### Campos del Cliente

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `client.tipo_documento` | string | Si | "6"=RUC, "1"=DNI, "4"=CE, "0"=Otros |
| `client.numero_documento` | string(15) | Si | Numero de documento |
| `client.razon_social` | string(255) | Si | Razon social o nombre |
| `client.direccion` | string | No | Direccion |
| `client.email` | email | No | Email del cliente. **Si se incluye y la empresa tiene email activo, se envia el PDF automaticamente** |
| `client.telefono` | string(20) | No | Telefono |
| `client.ubigeo` | string(6) | No | Codigo UBIGEO |

### Campos del Detalle

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `detalles[].codigo` | string(50) | Si | Codigo del producto |
| `detalles[].descripcion` | string(500) | Si | Descripcion |
| `detalles[].unidad` | string(3) | Si | Unidad de medida |
| `detalles[].cantidad` | numeric | Si | Cantidad (>0) |
| `detalles[].mto_valor_unitario` | numeric | Si* | Precio SIN IGV |
| `detalles[].mto_precio_unitario` | numeric | Si* | Precio CON IGV |
| `detalles[].tip_afe_igv` | string | No | Tipo afectacion IGV (default: "10") |
| `detalles[].porcentaje_igv` | numeric | No | % IGV (default: 18) |
| `detalles[].codigo_producto_sunat` | string | No | Codigo producto SUNAT |
| `detalles[].descuentos` | array | No | Descuentos por linea |

> *Usar `mto_valor_unitario` (sin IGV) O `mto_precio_unitario` (con IGV), no ambos.

### Response (201)

```json
{
  "success": true,
  "data": {
    "id": 3,
    "numero_completo": "F001-000003",
    "serie": "F001",
    "correlativo": "000003",
    "fecha_emision": "2026-04-13T00:00:00.000000Z",
    "moneda": "PEN",
    "estado_sunat": "EN_COLA",
    "empresa": {
      "ruc": "20132373958",
      "razon_social": "MI EMPRESA S.A.C."
    },
    "sucursal": {
      "codigo": "0000",
      "nombre": "Principal"
    },
    "cliente": {
      "tipo_documento": "6",
      "numero_documento": "20100039207",
      "razon_social": "RANSA COMERCIAL S.A."
    },
    "totales": {
      "gravada": 100.00,
      "exonerada": 0.00,
      "inafecta": 0.00,
      "igv": 18.00,
      "isc": 0.00,
      "icbper": 0.00,
      "total": 118.00
    },
    "detalles": [
      {
        "codigo": "001",
        "descripcion": "SERVICIO DE CONSULTORIA",
        "unidad": "ZZ",
        "cantidad": 1,
        "mto_valor_unitario": 100.00,
        "tip_afe_igv": "10",
        "porcentaje_igv": 18,
        "mto_valor_venta": 100.00,
        "mto_base_igv": 100.00,
        "igv": 18.00,
        "total_impuestos": 18.00,
        "mto_precio_unitario": 118.00,
        "isc": 0,
        "icbper": 0
      }
    ],
    "leyendas": [
      {
        "code": "1000",
        "value": "CIENTO DIECIOCHO CON 00/100 SOLES"
      }
    ],
    "consulta_url": "https://beta.syncrofact.net.pe/consulta/20132373958/01/F001-00000003",
    "pdf_url": "https://beta.syncrofact.net.pe/consulta/20132373958/01/F001-00000003/pdf"
  },
  "message": "Factura creada correctamente"
}
```

---

## 3. Crear Boleta

```
POST /v1/boletas
```

### Ejemplo Minimo

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "B001",
  "fecha_emision": "2026-04-13",
  "moneda": "PEN",
  "metodo_envio": "individual",
  "forma_pago_tipo": "Contado",
  "client": {
    "tipo_documento": "1",
    "numero_documento": "12345678",
    "razon_social": "JUAN PEREZ GARCIA"
  },
  "detalles": [
    {
      "codigo": "001",
      "descripcion": "PRODUCTO DE VENTA",
      "unidad": "NIU",
      "cantidad": 3,
      "mto_precio_unitario": 59.00,
      "tip_afe_igv": "10",
      "porcentaje_igv": 18
    }
  ]
}
```

### Campos Adicionales de Boleta

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `metodo_envio` | string | Si | "individual" o "resumen_diario" |

> **Nota:** Si el monto total > S/ 700, se requiere DNI real (no generico como 99999999).

---

## 4. Crear Nota de Credito

```
POST /v1/credit-notes
```

> **Comprobante individual.** La NC se emite como cualquier otra factura/boleta:
> se firma, se manda al SEE Del Contribuyente y SUNAT responde con CDR. **NO va
> por resumen diario**, ni para facturas ni para boletas.
>
> El resumen diario (RC) es solo para informar boletas o **anular boletas con
> estado `3`**, no para emitir notas vinculadas a ellas. Si el cliente quiere
> una devolucion, descuento o correccion sobre una boleta, se emite una NC
> con serie `BC*` (ver mas abajo).

### Regla critica: prefijo de la serie segun el documento afectado

SUNAT diferencia visualmente las NC segun el tipo de documento que afectan.
**Esto es validado en el momento de la emision; usar el prefijo incorrecto
provoca rechazo SUNAT (codigo 2335 / 2306).**

| `tipo_doc_afectado` | Documento afectado | Prefijo de la serie de NC | Ejemplos |
|---------------------|--------------------|----------------------------|----------|
| `01` | Factura | `F` (`FC...`) | `FC01`, `FC02` |
| `03` | Boleta | `B` (`BC...`) | `BC01`, `BC02` |
| `07` | Otra Nota de Credito | mismo prefijo del doc original | segun caso |
| `08` | Nota de Debito | mismo prefijo del doc original | segun caso |

Tu sucursal trae por defecto `FC01` y `BC01` desde el alta. Para integraciones
API, al generar tu primer token se autogeneran tambien `FC02` y `BC02`. Puedes
agregar mas series desde el panel (Sucursales -> Crear Serie Batch).

### Ejemplo 4.1 - NC para anular una Factura

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "FC02",
  "fecha_emision": "2026-04-28",
  "moneda": "PEN",
  "tipo_doc_afectado": "01",
  "num_doc_afectado": "F001-00000003",
  "cod_motivo": "01",
  "des_motivo": "Anulacion de la operacion",
  "client": {
    "tipo_documento": "6",
    "numero_documento": "20100039207",
    "razon_social": "RANSA COMERCIAL S.A."
  },
  "detalles": [
    {
      "codigo": "001",
      "descripcion": "SERVICIO DE CONSULTORIA",
      "unidad": "ZZ",
      "cantidad": 1,
      "mto_valor_unitario": 100.00,
      "tip_afe_igv": "10"
    }
  ]
}
```

### Ejemplo 4.2 - NC a una Boleta (devolucion, descuento, correccion)

Cambian dos campos respecto a la NC de factura: la **serie** debe usar prefijo
`BC` y `tipo_doc_afectado` debe ser `"03"`. El resto del payload es identico.

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "BC02",
  "fecha_emision": "2026-04-28",
  "moneda": "PEN",
  "tipo_doc_afectado": "03",
  "num_doc_afectado": "B001-00000015",
  "cod_motivo": "06",
  "des_motivo": "Devolucion total - cliente desistio de la compra",
  "client": {
    "tipo_documento": "1",
    "numero_documento": "12345678",
    "razon_social": "JUAN PEREZ GARCIA"
  },
  "detalles": [
    {
      "codigo": "PROD-001",
      "descripcion": "ARTICULO DEVUELTO",
      "unidad": "NIU",
      "cantidad": 1,
      "mto_precio_unitario": 59.00,
      "tip_afe_igv": "10",
      "porcentaje_igv": 18
    }
  ]
}
```

> El cliente debe coincidir con el receptor de la boleta original (mismo
> tipo_documento + numero_documento). Si la boleta usaba DNI, la NC usa el
> mismo DNI.

### Campos Adicionales de Nota de Credito

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `tipo_doc_afectado` | string | Si | `01`=Factura, `03`=Boleta, `07`=NC, `08`=ND |
| `num_doc_afectado` | string(20) | Si | Numero completo del doc afectado (ej: `F001-00000001`, `B001-00000015`) |
| `cod_motivo` | string | Si | Codigo de motivo (ver tabla) |
| `des_motivo` | string(250) | Si | Descripcion libre del motivo |

### Codigos de Motivo - Nota de Credito (Catalogo SUNAT 09)

| Codigo | Descripcion | Tipico cuando afecta... |
|--------|-------------|--------------------------|
| 01 | Anulacion de la operacion | Factura o boleta |
| 02 | Anulacion por error en el RUC | Factura |
| 03 | Correccion por error en la descripcion | Cualquiera |
| 04 | Descuento global | Cualquiera |
| 05 | Descuento por item | Cualquiera |
| 06 | Devolucion total | Boleta (caso comun) o factura |
| 07 | Devolucion por item | Cualquiera |
| 08 | Bonificacion | Cualquiera |
| 09 | Disminucion en el valor | Cualquiera |
| 10 | Otros conceptos | Cualquiera |
| 11 | Ajustes de operaciones de exportacion | Factura de exportacion |
| 12 | Ajustes afectos al IVAP | IVAP |
| 13 | Ajustes - Loss or Decrease in Value | Factura |

### Restricciones validadas por la API antes de enviar a SUNAT

- El documento afectado (factura/boleta) debe **existir** en la empresa y estar **`ACEPTADO`** por SUNAT.
- La fecha de emision de la NC no puede ser anterior a la del documento afectado.
- La moneda y la razon social del cliente deben coincidir con el documento afectado.
- Si la boleta original tenia monto > S/ 700 y se uso DNI generico, la NC requiere DNI real.

### NC vs Comunicacion de Baja: cuando usar cada una

| Caso | Mecanismo |
|------|-----------|
| Boleta con error de digitacion (RUC, descripcion, monto) emitida hace < 7 dias | **NC con serie BC*** |
| Boleta de venta cancelada antes de entrega, < 7 dias | **NC con serie BC*** (motivo `01`) o **anular via Resumen Diario** (estado `3`) |
| Factura emitida hace < 7 dias y aun no fue pagada | **Comunicacion de Baja** (ver seccion 19) o **NC** |
| Factura ya pagada y aceptada por el cliente | **NC** (la baja no procede) |
| Factura/NC con mas de 7 dias | **NC** (la baja no es viable; el plazo de baja vencio) |

> En la practica, **NC es la herramienta universal** para revertir efectos
> contables. La comunicacion de baja es solo un atajo administrativo cuando el
> documento es muy reciente y no tuvo trazabilidad contable. Si tienes duda,
> emite una NC.

---

## 5. Crear Nota de Debito

```
POST /v1/debit-notes
```

> **Comprobante individual.** Igual que la NC: se emite directo al SEE Del
> Contribuyente, no por resumen. Aplica para facturas Y boletas.

### Regla de prefijo de serie segun documento afectado

| `tipo_doc_afectado` | Documento afectado | Prefijo de la serie de ND | Ejemplos |
|---------------------|--------------------|----------------------------|----------|
| `01` | Factura | `F` (`FD...`) | `FD01`, `FD02` |
| `03` | Boleta | `B` (`BD...`) | `BD01`, `BD02` |

Tu sucursal trae por defecto `FD01` y `BD01`. Para integraciones API se
autogeneran tambien `FD02` y `BD02` al generar el primer token.

### Ejemplo 5.1 - ND a una Factura (intereses por mora)

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "FD02",
  "fecha_emision": "2026-04-28",
  "moneda": "PEN",
  "tipo_doc_afectado": "01",
  "num_doc_afectado": "F001-00000001",
  "cod_motivo": "01",
  "des_motivo": "Intereses por mora",
  "client": {
    "tipo_documento": "6",
    "numero_documento": "20100039207",
    "razon_social": "RANSA COMERCIAL S.A."
  },
  "detalles": [
    {
      "codigo": "INT-001",
      "descripcion": "INTERESES POR MORA - 30 DIAS",
      "unidad": "ZZ",
      "cantidad": 1,
      "mto_valor_unitario": 50.00,
      "tip_afe_igv": "10"
    }
  ]
}
```

### Ejemplo 5.2 - ND a una Boleta (aumento en el valor)

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "BD02",
  "fecha_emision": "2026-04-28",
  "moneda": "PEN",
  "tipo_doc_afectado": "03",
  "num_doc_afectado": "B001-00000020",
  "cod_motivo": "02",
  "des_motivo": "Aumento por servicio adicional no facturado",
  "client": {
    "tipo_documento": "1",
    "numero_documento": "12345678",
    "razon_social": "JUAN PEREZ GARCIA"
  },
  "detalles": [
    {
      "codigo": "EXTRA-001",
      "descripcion": "SERVICIO ADICIONAL DE INSTALACION",
      "unidad": "ZZ",
      "cantidad": 1,
      "mto_precio_unitario": 35.40,
      "tip_afe_igv": "10",
      "porcentaje_igv": 18
    }
  ]
}
```

### Codigos de Motivo - Nota de Debito (Catalogo SUNAT 10)

| Codigo | Descripcion |
|--------|-------------|
| 01 | Intereses por mora |
| 02 | Aumento en el valor |
| 03 | Penalidades u otros conceptos |
| 10 | Ajustes de operaciones de exportacion |
| 11 | Ajustes afectos al IVAP |

---

## 6. Crear Guia de Remision

```
POST /v1/dispatch-guides
```

### Ejemplo - Transporte Privado

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "T001",
  "fecha_emision": "2026-04-13",
  "cod_traslado": "01",
  "mod_traslado": "02",
  "fecha_traslado": "2026-04-14",
  "peso_total": 150.5,
  "und_peso_total": "KGM",
  "destinatario": {
    "tipo_documento": "6",
    "numero_documento": "20100039207",
    "razon_social": "RANSA COMERCIAL S.A."
  },
  "partida": {
    "ubigeo": "130101",
    "direccion": "AV. ESPAÑA 1234, TRUJILLO"
  },
  "llegada": {
    "ubigeo": "150101",
    "direccion": "AV. ARGENTINA 2833, LIMA"
  },
  "conductor_tipo_doc": "1",
  "conductor_num_doc": "41410641",
  "conductor_nombres": "JUAN",
  "conductor_apellidos": "ROMERO AVALOS",
  "conductor_licencia": "Q41410641",
  "vehiculo_placa": "T7R831",
  "detalles": [
    {
      "codigo": "PROD-001",
      "descripcion": "POLLO BENEFICIADO",
      "unidad": "KGM",
      "cantidad": 150.5
    }
  ]
}
```

### Ejemplo - Transporte Publico

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "T001",
  "fecha_emision": "2026-04-13",
  "cod_traslado": "01",
  "mod_traslado": "01",
  "fecha_traslado": "2026-04-14",
  "peso_total": 500,
  "und_peso_total": "KGM",
  "destinatario": {
    "tipo_documento": "6",
    "numero_documento": "20100039207",
    "razon_social": "RANSA COMERCIAL S.A."
  },
  "partida": {
    "ubigeo": "130101",
    "direccion": "AV. ESPAÑA 1234, TRUJILLO"
  },
  "llegada": {
    "ubigeo": "150101",
    "direccion": "AV. ARGENTINA 2833, LIMA"
  },
  "transportista_tipo_doc": "6",
  "transportista_num_doc": "20100039207",
  "transportista_razon_social": "TRANSPORTES CRUZ DEL SUR S.A.",
  "transportista_nro_mtc": "123456",
  "detalles": [
    {
      "codigo": "PROD-001",
      "descripcion": "MERCADERIA GENERAL",
      "unidad": "NIU",
      "cantidad": 50
    }
  ]
}
```

### Campos de Guia de Remision

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `cod_traslado` | string(2) | Si | Motivo de traslado |
| `mod_traslado` | string | Si | "01"=Publico, "02"=Privado |
| `fecha_traslado` | date | Si | Fecha inicio traslado |
| `peso_total` | numeric | Si | Peso total (>0) |
| `und_peso_total` | string(3) | Si | Unidad peso (KGM, TNE) |
| `partida.ubigeo` | string(6) | Si | UBIGEO punto partida |
| `partida.direccion` | string | Si | Direccion punto partida |
| `llegada.ubigeo` | string(6) | Si | UBIGEO punto llegada |
| `llegada.direccion` | string | Si | Direccion punto llegada |
| `num_bultos` | integer | No | Numero de bultos |
| `observaciones` | string(1000) | No | Observaciones |
| `indicadores` | array | No | Indicadores SUNAT |

### Codigos de Traslado

| Codigo | Descripcion |
|--------|-------------|
| 01 | Venta |
| 02 | Compra |
| 03 | Venta con entrega a terceros |
| 04 | Traslado entre establecimientos |
| 08 | Importacion |
| 09 | Exportacion |
| 13 | Otros |
| 14 | Venta sujeta a confirmacion del comprador |
| 17 | Traslado de bienes para transformacion |
| 18 | Traslado emisor itinerante CP |
| 19 | Traslado zona primaria |

---

## 7. Consultar Documentos

### Listar Facturas

```
GET /v1/invoices
```

Parametros de query opcionales:
- `page` - Numero de pagina
- `per_page` - Items por pagina (default: 15)
- `search` - Buscar por numero o cliente
- `estado_sunat` - Filtrar por estado
- `fecha_desde` - Fecha desde (YYYY-MM-DD)
- `fecha_hasta` - Fecha hasta (YYYY-MM-DD)

### Obtener Factura por ID

```
GET /v1/invoices/{id}
```

### Reenviar a SUNAT

```
POST /v1/invoices/{id}/send-sunat
```

### Endpoints equivalentes para otros documentos:

| Documento | Listar | Detalle | Enviar SUNAT |
|-----------|--------|---------|--------------|
| Facturas | GET `/v1/invoices` | GET `/v1/invoices/{id}` | POST `/v1/invoices/{id}/send-sunat` |
| Boletas | GET `/v1/boletas` | GET `/v1/boletas/{id}` | POST `/v1/boletas/{id}/send-sunat` |
| Notas Credito | GET `/v1/credit-notes` | GET `/v1/credit-notes/{id}` | POST `/v1/credit-notes/{id}/send-sunat` |
| Notas Debito | GET `/v1/debit-notes` | GET `/v1/debit-notes/{id}` | POST `/v1/debit-notes/{id}/send-sunat` |
| Guias Remision | GET `/v1/dispatch-guides` | GET `/v1/dispatch-guides/{id}` | POST `/v1/dispatch-guides/{id}/send-sunat` |

---

## 8. Descargar XML/PDF/CDR

Disponible para facturas, boletas, notas de credito, notas de debito y guias:

| Recurso | Endpoint |
|---------|----------|
| XML | GET `/v1/invoices/{id}/download-xml` |
| PDF | GET `/v1/invoices/{id}/download-pdf` |
| CDR | GET `/v1/invoices/{id}/download-cdr` |

> Reemplazar `invoices` por `boletas`, `credit-notes`, `debit-notes` o `dispatch-guides` segun el tipo.

### URL Publica de Consulta

Cada documento generado incluye una URL publica para consulta sin autenticacion:

```
https://beta.syncrofact.net.pe/consulta/{ruc}/{tipo_doc}/{serie-correlativo}
https://beta.syncrofact.net.pe/consulta/{ruc}/{tipo_doc}/{serie-correlativo}/pdf
```

---

## 9. Estados SUNAT

| Estado | Descripcion |
|--------|-------------|
| `PENDIENTE` | Creado, sin enviar |
| `EN_COLA` | En cola de envio automatico |
| `ENVIANDO` | Enviandose a SUNAT |
| `ACEPTADO` | Aceptado por SUNAT |
| `RECHAZADO` | Rechazado por SUNAT (ver mensaje de error) |
| `ERROR` | Error en el procesamiento |

El envio a SUNAT es **automatico** al crear el documento (estado `EN_COLA`). El worker procesa la cola y envia a SUNAT. Normalmente toma entre 5-30 segundos.

Para verificar el estado, consultar el documento:

```
GET /v1/invoices/{id}
```

---

## 10. Codigos de Referencia

### Tipos de Documento de Identidad

| Codigo | Descripcion |
|--------|-------------|
| 0 | Otros |
| 1 | DNI |
| 4 | Carnet de Extranjeria |
| 6 | RUC |
| 7 | Pasaporte |
| A | Cedula Diplomatica |
| B | Doc. de Identidad Pais de Residencia (No domiciliados) |

### Tipos de Afectacion IGV (tip_afe_igv)

| Codigo | Descripcion | IGV |
|--------|-------------|-----|
| 10 | Gravado - Operacion Onerosa | 18% |
| 20 | Exonerado - Operacion Onerosa | 0% |
| 30 | Inafecto - Operacion Onerosa | 0% |
| 40 | Exportacion | 0% |
| 11-16 | Gravado - Gratuita (transferencia/retiro) | 18% (no cobra) |
| 17 | Gravado - IVAP | Variable |
| 31-36 | Inafecto - Gratuita | 0% |

### Unidades de Medida Comunes

| Codigo | Descripcion |
|--------|-------------|
| NIU | Unidad |
| ZZ | Servicio |
| KGM | Kilogramo |
| TNE | Tonelada |
| MTR | Metro |
| LTR | Litro |
| GLL | Galon |
| DZN | Docena |
| BX | Caja |

### Monedas

| Codigo | Descripcion |
|--------|-------------|
| PEN | Sol peruano |
| USD | Dolar americano |

---

## 11. Errores Comunes

### Estructura de Error

```json
{
  "success": false,
  "message": "Descripcion del error",
  "errors": {
    "campo": ["Mensaje de validacion"]
  }
}
```

### Errores Frecuentes

| Error | Causa | Solucion |
|-------|-------|----------|
| `La empresa es requerida` | Falta `company_id` | Incluir `company_id` en el request |
| `La sucursal es requerida` | Falta `branch_id` | Incluir `branch_id` en el request |
| `La serie es requerida` | Falta `serie` | Incluir serie valida (F001, B001, etc.) |
| `mto_precio_unitario field is required when mto_valor_unitario is not present` | Falta precio | Incluir `mto_valor_unitario` O `mto_precio_unitario` |
| `Unauthenticated` | Token invalido o expirado | Verificar el token o hacer login nuevamente |
| `La sucursal no pertenece a la empresa` | branch_id incorrecto | Verificar que la sucursal pertenezca a la empresa |

---

## Ejemplo Completo con cURL

### 1. Login y obtener token

```bash
curl -s -X POST https://api-beta.syncrofact.net.pe/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@empresa.com","password":"password123"}'
```

### 2. Crear factura

```bash
curl -s -X POST https://api-beta.syncrofact.net.pe/api/v1/invoices \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 1,
    "branch_id": 1,
    "serie": "F001",
    "fecha_emision": "2026-04-13",
    "moneda": "PEN",
    "forma_pago_tipo": "Contado",
    "client": {
      "tipo_documento": "6",
      "numero_documento": "20100039207",
      "razon_social": "RANSA COMERCIAL S.A."
    },
    "detalles": [
      {
        "codigo": "001",
        "descripcion": "SERVICIO DE CONSULTORIA",
        "unidad": "ZZ",
        "cantidad": 1,
        "mto_valor_unitario": 100.00,
        "tip_afe_igv": "10"
      }
    ]
  }'
```

### 3. Verificar estado

```bash
curl -s https://api-beta.syncrofact.net.pe/api/v1/invoices/3 \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 4. Descargar PDF

```bash
curl -s -o factura.pdf https://api-beta.syncrofact.net.pe/api/v1/invoices/3/download-pdf \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## 12. Consultar Series y Correlativos

Estos endpoints son el **primer paso para integrar tu sistema**. Te permiten saber que series
tienes asignadas, el correlativo actual de cada una y si hay gaps. Son necesarios para:

- **Saber que series usar:** tu sistema solo debe emitir en series con `tipo_uso: "api"`.
- **Sincronizar el counter:** al iniciar el dia o al reconectar, consultas el proximo correlativo para continuar la secuencia.
- **Auditar integridad:** verificar que no falten correlativos (gaps) entre tu sistema y el de facturacion.

### 12.1. Listar series y correlativos

```
GET /v1/integracion/series-correlativos
```

**Query params opcionales:**
| Parametro | Descripcion |
|---|---|
| `branch_id` | Filtra por sucursal especifica |
| `tipo_uso` | `web` o `api`. Si se omite, devuelve ambos |
| `tipo_documento` | `01` (factura), `03` (boleta), `07` (NC), `08` (ND), `09` (GRE) |

**Importante:** usa siempre `?tipo_uso=api` desde tu integracion. Las series `web`
estan reservadas para el portal administrativo de la empresa y compartir la numeracion
puede causar colisiones de correlativo.

**Ejemplo:**
```bash
curl -H "Authorization: Bearer TU_TOKEN" \
  "https://api.syncrofact.net.pe/api/v1/integracion/series-correlativos?tipo_uso=api"
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "company_id": 1,
    "branches": [
      {
        "branch_id": 1,
        "codigo": "0000",
        "nombre": "Principal",
        "series": [
          {
            "serie": "F002",
            "tipo_documento": "01",
            "tipo_documento_nombre": "Factura",
            "tipo_uso": "api",
            "correlativo_actual": 62,
            "cant_bd": 62,
            "gaps": 0,
            "proximo_numero": "F002-000063"
          },
          {
            "serie": "B002",
            "tipo_documento": "03",
            "tipo_documento_nombre": "Boleta",
            "tipo_uso": "api",
            "correlativo_actual": 15,
            "cant_bd": 15,
            "gaps": 0,
            "proximo_numero": "B002-000016"
          }
        ]
      }
    ]
  }
}
```

### 12.2. Consultar proximo numero de una serie

Cuando solo necesitas el proximo numero de una serie especifica (ej. para mostrarlo
en tu pantalla antes de enviar):

```
GET /v1/integracion/proximo-numero?tipo_documento=01&serie=F002
```

**Query params:**
| Parametro | Requerido | Descripcion |
|---|---|---|
| `tipo_documento` | Si | Codigo SUNAT (01, 03, 07, 08, 09) |
| `serie` | Si | Serie a consultar (ej. F002) |
| `branch_id` | No | Sucursal especifica; si se omite, toma la primera activa |

**Ejemplo:**
```bash
curl -H "Authorization: Bearer TU_TOKEN" \
  "https://api.syncrofact.net.pe/api/v1/integracion/proximo-numero?tipo_documento=01&serie=F002"
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "branch_id": 1,
    "tipo_documento": "01",
    "serie": "F002",
    "correlativo_actual": 42,
    "proximo_correlativo": 43,
    "proximo_numero": "F002-000043"
  }
}
```

### 12.3. Importante: la consulta NO reserva

El endpoint **solo informa**. No bloquea ni incrementa el correlativo.

> **RECOMENDACION:** En lugar de depender del correlativo auto-generado, tu sistema
> deberia **enviar su propio correlativo** en cada POST. Esto te permite seguir operando
> si el sistema de facturacion cae. Usa este endpoint para **sincronizar tu counter**
> al iniciar el dia o al reconectar. Ver seccion 17 para el flujo completo.

**Campos nuevos en la respuesta:**
| Campo | Descripcion |
|---|---|
| `correlativo_actual` | Ultimo correlativo asignado (counter) |
| `cant_bd` | Cantidad real de documentos en la tabla para esa serie |
| `gaps` | Diferencia: `correlativo_actual - cant_bd`. Si es > 0, hay correlativos faltantes |
| `proximo_numero` | Siguiente numero que se asignaria si no se envia correlativo |

### 12.4. Reglas de series web vs api

Al crear una sucursal o regenerar tu token API, Syncrofact configura automaticamente
series dedicadas para tu uso:

| Escenario | Que hace el sistema |
|---|---|
| Web usa `F001`, API esta vacio | Auto-genera `F002` para ti |
| Web usa `F001`, `F002`, API esta vacio | Auto-genera `F003` para ti |
| Web usa `F001`, API ya tiene `F005` | No toca (respeta lo existente) |
| Regeneras tu token API | No se modifican las series existentes |

Tu correlativo acumulado (p.ej. `F002-000042`) **se preserva siempre**, incluso si
regeneras el token o si el admin modifica configuracion.

---

## 13. Bancarizacion (Ley N° 28194)

La **Ley N° 28194** (Ley para la lucha contra la evasion y la formalizacion de la economia)
establece que las operaciones **mayores o iguales a S/ 2,000 PEN** o **US$ 500 USD** deben
pagarse a traves de un **medio bancario autorizado** para que:

- Sea **gasto deducible** para Impuesto a la Renta.
- Otorgue **credito fiscal de IGV**.

Syncrofact valida esto **automaticamente en cada POST de factura/boleta**. Si el total
supera el umbral y **no envias datos de bancarizacion**, la API rechaza con un error claro:

```json
{
  "success": false,
  "message": "BANCARIZACION OBLIGATORIA: ...",
  "errors": { "bancarizacion": ["..."] }
}
```

### 13.1. Formato moderno: `medios_pago` (recomendado)

Soporta **multiples medios** por documento (ej: parte en efectivo + parte transferencia).

```json
{
  "medios_pago": [
    {
      "tipo": "BANCA_WEB",
      "entidad_financiera": "BCP",
      "referencia": "OP-20260415-0001",
      "fecha_operacion": "2026-04-15",
      "monto": 2832.00
    }
  ]
}
```

**Campos:**
| Campo | Requerido | Descripcion |
|---|---|---|
| `tipo` | Si | Codigo del medio de pago (ej: `BANCA_WEB`, `BANCA_APP`, `TRANSFERENCIA`, `EFECTIVO`). Consulta el catalogo en `GET /v1/bancarizacion/medios-pago` |
| `entidad_financiera` | Depende tipo | Banco emisor (ej: "BCP", "BBVA", "Interbank"). Requerido si el medio lo exige. |
| `referencia` | Depende tipo | Numero de operacion/transaccion. **Requerido para todos los medios bancarios.** NOTA: el campo se llama `referencia` (NO `numero_operacion`). |
| `fecha_operacion` | Depende tipo | Fecha de la transaccion en formato `YYYY-MM-DD`. |
| `monto` | Si | Monto en la moneda del documento. Suma total debe cubrir `mto_imp_venta`. |

### 13.2. Formato legacy: `bancarizacion` (compatibilidad)

Solo acepta **un medio de pago**:
```json
{
  "bancarizacion": {
    "medio_pago": "TRANSFERENCIA",
    "entidad_financiera": "BCP",
    "numero_operacion": "OP-20260415-0001",
    "fecha_operacion": "2026-04-15"
  }
}
```

**Nota:** en este formato el campo es `numero_operacion` (no `referencia`). Internamente
Syncrofact convierte esto al formato nuevo. Preferir `medios_pago` para nuevos integradores.

### 13.3. Consultar medios de pago disponibles

```bash
curl -H "Authorization: Bearer TU_TOKEN" \
  https://api.syncrofact.net.pe/api/v1/bancarizacion/medios-pago
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "codigo": "BANCA_WEB",
      "descripcion": "Banca por Internet",
      "requiere_numero_operacion": true,
      "requiere_banco": true,
      "requiere_fecha": true,
      "activo": true
    },
    {
      "codigo": "BANCA_APP",
      "descripcion": "App Movil Bancaria",
      "requiere_numero_operacion": true,
      "requiere_banco": true,
      "requiere_fecha": true
    },
    {
      "codigo": "EFECTIVO",
      "descripcion": "Efectivo",
      "requiere_numero_operacion": false,
      "requiere_banco": false
    }
    // ...
  ]
}
```

**Regla:** si `requiere_numero_operacion: true`, debes enviar el campo `referencia` en
`medios_pago` (o `numero_operacion` en el formato legacy). Omitirlo falla la validacion.

### 13.4. Casos donde NO aplica bancarizacion

- Monto total **< S/ 2,000 PEN** o **< US$ 500 USD** → puedes omitir `medios_pago`
- Operaciones gratuitas (donaciones, muestras) → no aplica
- Notas de credito de anulacion → heredan el metodo de pago del documento afectado

### 13.5. Leyenda automatica

Cuando aplica bancarizacion, Syncrofact agrega automaticamente al XML la leyenda SUNAT:

```
Codigo: 2005
Texto:  "OPERACION SUJETA A BANCARIZACION - LEY N° 28194"
```

No necesitas agregarla manualmente.

### 13.6. Validacion previa (opcional)

Si quieres validar antes del POST real si la operacion exige bancarizacion:

```
POST /v1/bancarizacion/validar
```

**Body:**
```json
{ "monto": 2832.00, "moneda": "PEN" }
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "aplica": true,
    "umbral": 2000,
    "moneda": "PEN",
    "mensaje": "La operacion supera el umbral de bancarizacion"
  }
}
```

### 13.7. Ejemplo completo de factura con bancarizacion

```bash
curl -X POST -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- https://api.syncrofact.net.pe/api/v1/invoices <<'JSON'
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "F002",
  "fecha_emision": "2026-04-15",
  "tipo_operacion": "0101",
  "moneda": "PEN",
  "forma_pago_tipo": "Contado",
  "medios_pago": [
    {
      "tipo": "BANCA_WEB",
      "entidad_financiera": "BCP",
      "referencia": "OP-20260415-0001",
      "fecha_operacion": "2026-04-15",
      "monto": 2832.00
    }
  ],
  "client": {
    "tipo_documento": "6",
    "numero_documento": "20100039207",
    "razon_social": "RANSA COMERCIAL S.A."
  },
  "detalles": [
    {
      "codigo": "LIC-001",
      "descripcion": "Licencia software anual",
      "unidad": "ZZ",
      "cantidad": 1,
      "mto_valor_unitario": 1200.00,
      "mto_precio_unitario": 1416.00,
      "tip_afe_igv": "10",
      "porcentaje_igv": 18
    },
    {
      "codigo": "SUP-001",
      "descripcion": "Soporte premium 24/7",
      "unidad": "ZZ",
      "cantidad": 6,
      "mto_valor_unitario": 150.00,
      "mto_precio_unitario": 177.00,
      "tip_afe_igv": "10",
      "porcentaje_igv": 18
    }
  ]
}
JSON
```

### 13.8. Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `BANCARIZACION OBLIGATORIA: Esta operacion supera el umbral...` | Total > S/ 2,000 sin `medios_pago` | Agregar array `medios_pago` con al menos un elemento |
| `medios_pago.0.tipo field is required` | Omitiste `tipo` | Agrega `tipo` (ej: `BANCA_WEB`) |
| `El tipo 'XXX' no es valido o no esta activo` | Usaste codigo SUNAT (008, 009) en vez del codigo interno | Consulta `/v1/bancarizacion/medios-pago` y usa los codigos correctos |
| `Requiere numero de referencia/operacion` | Campo se llama `referencia` (no `numero_operacion`) en `medios_pago` | Renombra el campo a `referencia` |
| La suma de `medios_pago[].monto` no cubre el total | Monto incorrecto | Asegurate que la suma sea exactamente `mto_imp_venta` |

---

## 14. Formato exacto de items (`detalles[]`)

Este es el error mas comun al integrar. **Los nombres de campo son estrictos.**
Si envias nombres similares pero incorrectos (`codigo_producto`, `valor_unitario`,
`precio_unitario`), la API rechaza con un 422.

### 14.1. Estructura canonica de cada item

```json
{
  "codigo": "SKU-001",
  "descripcion": "Servicio de consultoria",
  "unidad": "ZZ",
  "cantidad": 1,
  "mto_valor_unitario": 100.00,
  "mto_precio_unitario": 118.00,
  "tip_afe_igv": "10",
  "porcentaje_igv": 18
}
```

### 14.2. Tabla de campos

| Campo | Requerido | Descripcion | Ejemplo |
|---|---|---|---|
| `codigo` | Si | Codigo interno del producto/servicio. NO usar `codigo_producto`. | `"SKU-001"` |
| `descripcion` | Si | Descripcion que aparecera en el comprobante. | `"Servicio de consultoria"` |
| `unidad` | Si | Codigo SUNAT de unidad de medida (catalogo 03). | `"NIU"` unidad, `"ZZ"` servicio, `"KGM"` kilo |
| `cantidad` | Si | Cantidad numerica. Acepta decimales (ej: 1.5 kg). | `2` |
| `mto_valor_unitario` | Si | Valor unitario **SIN IGV**. NO usar `valor_unitario`. | `100.00` |
| `mto_precio_unitario` | Si | Precio unitario **CON IGV**. NO usar `precio_unitario`. | `118.00` |
| `tip_afe_igv` | Si | Tipo de afectacion IGV (catalogo 07). Ver seccion 14.4. | `"10"` gravado |
| `porcentaje_igv` | Si | Porcentaje de IGV aplicable. Normalmente `18`. | `18` |

### 14.3. Relacion entre valores

Para items **gravados** (`tip_afe_igv: "10"`):
```
mto_precio_unitario = mto_valor_unitario * (1 + porcentaje_igv/100)
```
Ej: valor_unitario 100 con IGV 18% → precio_unitario = 118.

Para items **exonerados** o **inafectos** (`tip_afe_igv: "20"` o `"30"`):
```
mto_precio_unitario = mto_valor_unitario  (no tienen IGV)
```

### 14.4. Valores de `tip_afe_igv` (catalogo SUNAT 07)

| Codigo | Significado | IGV |
|---|---|---|
| `10` | Gravado - Operacion Onerosa | Si |
| `20` | Exonerado - Operacion Onerosa | No |
| `30` | Inafecto - Operacion Onerosa | No |
| `40` | Exportacion | No |
| `11`, `12`, `13`, `14`, `15`, `16`, `17` | Gravado - Operacion Gratuita | Si (calculado) |
| `21` | Exonerado - Gratuita | No |
| `31` | Inafecto - Gratuita | No |

Casos comunes:
- Venta normal de bien/servicio → `10`
- Libros, pan comun → `20` (exonerado)
- Servicio educativo, medicos → `30` (inafecto)
- Bonificacion, muestra, donacion → `11` (gratuito gravado)

### 14.5. Unidades de medida mas usadas

| Codigo | Descripcion |
|---|---|
| `NIU` | Unidad (bienes) |
| `ZZ` | Servicios |
| `KGM` | Kilogramo |
| `MTR` | Metro |
| `LTR` | Litro |
| `BG` | Bolsa |
| `BX` | Caja |
| `CA` | Lata |
| `DR` | Tambor |
| `PK` | Paquete |

Catalogo completo: SUNAT catalogo #03.

### 14.6. Ejemplo con varios items mezclados

```json
"detalles": [
  {
    "codigo": "LIB-001",
    "descripcion": "Libro de matematicas",
    "unidad": "NIU",
    "cantidad": 3,
    "mto_valor_unitario": 45.00,
    "mto_precio_unitario": 45.00,
    "tip_afe_igv": "20",
    "porcentaje_igv": 0
  },
  {
    "codigo": "SRV-001",
    "descripcion": "Envio a domicilio",
    "unidad": "ZZ",
    "cantidad": 1,
    "mto_valor_unitario": 15.00,
    "mto_precio_unitario": 17.70,
    "tip_afe_igv": "10",
    "porcentaje_igv": 18
  }
]
```

---

## 15. Detraccion (SPOT)

El **SPOT** (Sistema de Pago de Obligaciones Tributarias) conocido como **detraccion**
obliga al comprador a depositar un porcentaje del pago en la **cuenta detraccion del
proveedor** en el Banco de la Nacion.

**Aplica a servicios y bienes especificos** definidos en el Anexo 2 y 3 del DS 155-2004-EF.

### 15.1. Cuando aplica

- Operacion **≥ S/ 700** (umbral general, algunos casos tienen umbral distinto)
- Tipo de operacion definido en **catalogo 54** SUNAT (construccion, transporte, recoleccion
  de residuos, arrendamiento, servicios empresariales, etc.)

**Ejemplos tipicos:**
- Transporte de carga (codigo `022`) → 4%
- Servicio de construccion (codigo `012`) → 4%
- Arrendamiento de bienes muebles (codigo `019`) → 10%
- Servicios empresariales (codigo `037`) → 12%

### 15.2. Como enviar detraccion en el POST

Agrega el campo `detraccion` al body del POST `/v1/invoices`:

```json
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "F002",
  "fecha_emision": "2026-04-15",
  "tipo_operacion": "1001",
  "moneda": "PEN",
  "forma_pago_tipo": "Contado",
  "detraccion": {
    "codigo_bien_servicio": "022",
    "porcentaje": 4,
    "medio_pago": "003"
  },
  "medios_pago": [...],
  "client": {...},
  "detalles": [...]
}
```

**Campos de `detraccion`:**
| Campo | Requerido | Descripcion |
|---|---|---|
| `codigo_bien_servicio` | Si | Codigo catalogo 54 (ej: `022` transporte carga, `037` servicios empresariales) |
| `porcentaje` | No | Syncrofact lo calcula del catalogo si no lo envias. |
| `medio_pago` | Si | Normalmente `003` (deposito en cuenta Banco Nacion) |

### 15.3. tipo_operacion debe ser `1001`

Cuando hay detraccion, el `tipo_operacion` debe cambiar a `1001` (no `0101` normal).
Syncrofact puede ajustarlo automaticamente pero es mejor mandarlo correcto.

### 15.4. Cuenta de detraccion de la empresa

La empresa emisora debe tener configurada su **cuenta del Banco de la Nacion** en el perfil.
Syncrofact la incluye automaticamente en el XML. Si la empresa no la tiene configurada,
el sistema marca la factura con observacion pero igual la acepta.

### 15.5. Consultar catalogo de detracciones

```
GET /v1/catalogos/detracciones
```

Devuelve todos los codigos del catalogo 54 con sus porcentajes vigentes.

### 15.6. Leyenda automatica

Cuando aplica detraccion, Syncrofact agrega al XML:
```
Codigo: 2006
Texto:  "Operacion sujeta a detraccion"
```

### 15.7. Calculo del monto

El `mto_detraccion` se calcula como:
```
mto_detraccion = mto_imp_venta * (porcentaje / 100)
```
Ej: factura S/ 5,000 con detraccion 4% → S/ 200 se depositan en Banco Nacion,
el cliente paga al proveedor solo S/ 4,800.

### 15.8. Interaccion con bancarizacion

Cuando hay detraccion Y bancarizacion:
- El monto total de la factura sigue sujeto a bancarizacion si supera S/ 2,000
- El monto detraido (ej: S/ 200) es **parte de `medios_pago`** como deposito al Banco Nacion
- El resto (ej: S/ 4,800) va por el medio acordado

```json
"medios_pago": [
  { "tipo": "DEPOSITO_CUENTA", "entidad_financiera": "BANCO_NACION", "monto": 200.00, "referencia": "DET-..." },
  { "tipo": "BANCA_WEB", "entidad_financiera": "BCP", "monto": 4800.00, "referencia": "OP-..." }
]
```

---

## 16. Emision asincrona y estados SUNAT

La emision de documentos en Syncrofact es **asincrona**. El POST devuelve inmediatamente
con el documento creado en estado intermedio, y el envio a SUNAT ocurre en segundo plano.

### 16.1. Flujo completo

```
┌─────────────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐
│ POST doc    │ ──► │ EN_COLA  │ ──► │ PROCESANDO │ ──► │ ACEPTADO │ ✓
│ (100-300ms) │     │ ~0.5 seg │     │ ~2-5 seg   │     │ final    │
└─────────────┘     └──────────┘     └────────────┘     └──────────┘
                                                        ┌──────────┐
                                                  ──►   │ RECHAZADO│ ✗
                                                        │ final    │
                                                        └──────────┘
                                                        ┌──────────┐
                                                  ──►   │  ERROR   │ ✗
                                                        │ final    │
                                                        └──────────┘
```

El POST te devuelve `estado_sunat: "EN_COLA"` en pocos milisegundos. Despues de 2-5
segundos, SUNAT responde con la validacion final y el estado pasa a `ACEPTADO`,
`RECHAZADO`, o `ERROR`.

### 16.2. Estados posibles

| Estado | Terminal | Significado |
|---|---|---|
| `PENDIENTE` | No | Documento creado pero aun no encolado |
| `EN_COLA` | No | En la cola Redis esperando worker |
| `ENVIANDO` | No | Worker esta enviando XML firmado a SUNAT |
| `ENVIADO` | No | XML enviado, esperando respuesta |
| `PROCESANDO` | No | SUNAT esta validando |
| `ACEPTADO` | Si | ✓ SUNAT acepto. CDR disponible. |
| `RECHAZADO` | Si | ✗ SUNAT rechazo. Ver `respuesta_sunat` para detalles. |
| `ERROR` | Si | ✗ Error tecnico (conectividad, certificado, etc.) |

### 16.3. Opcion A: Polling (mas simple)

Tu sistema puede consultar `GET /v1/invoices/{id}` cada 3-5 segundos hasta obtener
un estado terminal.

```bash
# Pseudo-codigo
id = respuesta_post.data.id

loop {
  r = GET /v1/invoices/{id}
  estado = r.data.estado_sunat
  if estado in [ACEPTADO, RECHAZADO, ERROR]:
    break
  sleep 3
}
```

**No abuses:** el polling genera carga. Si procesas cientos de documentos, prefiere
webhooks.

### 16.4. Opcion B: Webhooks (recomendada para alto volumen)

Configuras una URL en tu sistema y Syncrofact te notifica via POST cuando el estado
cambia.

**Eventos disponibles:**
- `invoice.accepted` / `invoice.rejected`
- `boleta.accepted` / `boleta.rejected`
- `credit_note.accepted` / `credit_note.rejected`
- `debit_note.accepted` / `debit_note.rejected`
- `dispatch_guide.accepted` / `dispatch_guide.rejected`

**Configuracion:** en el panel admin → Webhooks → Crear webhook con URL, secret, eventos.

**Payload del webhook:**
```json
{
  "event": "invoice.accepted",
  "document_id": 17,
  "numero": "F002-000003",
  "company_id": 1,
  "cliente": {"num_doc": "20100039207", "razon_social": "RANSA..."},
  "monto": 2832.00,
  "moneda": "PEN",
  "fecha_emision": "2026-04-15T05:42:20+00:00",
  "estado_sunat": "ACEPTADO"
}
```

Detalles completos en `documentacion/webhooks.md`.

### 16.5. Consultar CDR tras ACEPTADO

Una vez en `ACEPTADO`, puedes descargar el **CDR** (Constancia de Recepcion) de SUNAT:
```
GET /v1/invoices/{id}/download-cdr
```

Tambien el XML firmado y el PDF:
```
GET /v1/invoices/{id}/download-xml
GET /v1/invoices/{id}/download-pdf
```

### 16.6. Reintentos en caso de ERROR

Si el estado final es `ERROR` (fallo tecnico, no rechazo SUNAT), puedes reintentar:
```
POST /v1/invoices/{id}/send-sunat
```

**NO reintentes automaticamente** en caso `RECHAZADO` — SUNAT rechazo por validacion
(RUC incorrecto, correlativo duplicado, firma invalida). Hay que corregir y emitir un
documento NUEVO; el rechazado queda asi.

### 16.7. Consideraciones importantes

- El correlativo se asigna y **consume** al crear el documento, aunque SUNAT rechace.
  Si F002-000043 es rechazado, el siguiente sera F002-000044.
- Boletas con `metodo_envio: "resumen_diario"` NO se envian individual — se acumulan
  para un Resumen Diario del dia.
- SUNAT acepta plazos: 7 dias calendario desde `fecha_emision` para facturas/NC/ND.
  Despues de ese plazo el documento queda en `ACEPTADO CON OBSERVACIONES` o es rechazado.

---

## 17. Resiliencia: correlativos y contingencia

### 17.0 Guia de inicio rapido para integradores

Si estas integrando tu sistema (POS, ERP, SAP) por primera vez, sigue estos pasos:

```
PASO 1 - Obtener tu token API
  POST /v1/login  o  generarlo desde el panel admin (Integracion API > Mi Token API)

PASO 2 - Consultar tus series disponibles
  GET /v1/integracion/series-correlativos?tipo_uso=api
  -> Identifica tus series (ej: F002 para facturas, B002 para boletas)
  -> Anota el proximo_numero de cada serie para iniciar tu counter

PASO 3 - Sincronizar tu counter interno
  GET /v1/integracion/proximo-numero?tipo_documento=01&serie=F002
  -> Tu sistema guarda: siguiente_correlativo = proximo_correlativo (ej: 63)

PASO 4 - Emitir documentos (SIEMPRE enviar correlativo + referencia_interna)
  POST /v1/invoices
  {
    "serie": "F002",
    "correlativo": 63,                      <- tu counter
    "referencia_interna": "TK-063-F002",    <- tu ID interno
    ...
  }
  -> Tu sistema incrementa: siguiente_correlativo = 64

PASO 5 - Si el sistema cae, tu POS sigue vendiendo con su counter local
  -> Cuando vuelve, reenvia los documentos pendientes
  -> La idempotencia por referencia_interna evita duplicados

PASO 6 - Auditar periodicamente
  GET /v1/integracion/monitor-correlativos?tipo_documento=01&serie=F002
  -> Verifica que todos tus tickets tienen su factura y que no hay gaps
```

### 17.1 El problema

Cuando el sistema de facturacion electronica no esta disponible (caida temporal, mantenimiento, problemas de red), tu sistema (POS, ERP, SAP) no puede emitir documentos porque los correlativos se generan en el servidor.

**Tu negocio no deberia detenerse por una caida temporal del sistema de facturacion.**

### 17.2 La solucion: `correlativo` + `referencia_interna`

> **RECOMENDACION:** La mejor forma de integrar tu sistema es enviando **ambos campos** (`correlativo` y `referencia_interna`) en cada request. Esto te da control total del correlativo y proteccion contra duplicados, sin importar si cae el sistema de facturacion, SUNAT, o tu propio sistema.

Todos los endpoints de creacion (facturas, boletas, notas de credito, notas de debito, guias de remision) aceptan dos campos opcionales:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `correlativo` | integer, nullable | El correlativo que tu sistema asigna. Si no lo envias, se auto-genera |
| `referencia_interna` | string (max 100), nullable | Tu ID interno (ticket, orden de venta, etc.) para rastreo e idempotencia |

### 17.3 Modos de operacion

| Modo | correlativo | referencia_interna | Comportamiento |
|------|:-----------:|:------------------:|----------------|
| Auto (default) | no enviar | no enviar | Sistema auto-genera todo. Compatible con integraciones existentes |
| Control total (A+C) | **enviar** | **enviar** | **RECOMENDADO.** Tu sistema controla el correlativo y tiene idempotencia |
| Solo correlativo (A) | enviar | no enviar | Tu sistema controla el correlativo sin idempotencia |
| Solo referencia (C) | no enviar | enviar | Auto-genera correlativo con idempotencia |

### 17.4 Flujo recomendado de integracion

```
INICIO DEL DIA:
  1. Tu sistema llama GET /v1/integracion/proximo-numero?tipo_documento=01&serie=F002
  2. Respuesta: { "proximo_correlativo": 46 }
  3. Tu sistema guarda: siguiente_correlativo = 46

OPERACION NORMAL (sistema UP):
  4. Venta #TK-100 -> POST /invoices { correlativo: 46, referencia_interna: "TK-100", ... }
     -> 201 { numero_completo: "F002-000046" }
  5. Venta #TK-101 -> POST /invoices { correlativo: 47, referencia_interna: "TK-101", ... }
     -> 201 { numero_completo: "F002-000047" }

SISTEMA DE FACTURACION CAE:
  6. Venta #TK-102 -> POST falla (timeout/error de red)
     Tu sistema guarda localmente: { correlativo: 48, referencia_interna: "TK-102", ... }
  7. Venta #TK-103 -> POST falla
     Tu sistema guarda localmente: { correlativo: 49, referencia_interna: "TK-103", ... }
  8. El cliente recibe ticket interno o comprobante provisional

SISTEMA VUELVE:
  9. Tu sistema reenvia los documentos pendientes:
     POST /invoices { correlativo: 48, referencia_interna: "TK-102", ... } -> 201 OK
     POST /invoices { correlativo: 49, referencia_interna: "TK-103", ... } -> 201 OK
 10. Si un POST se envio dos veces por error de red:
     POST /invoices { referencia_interna: "TK-102", ... }
     -> 200 { idempotent: true, data: { ... documento existente ... } }
     No se duplica.
```

### 17.5 Ejemplo completo del request

```json
POST /api/v1/invoices
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "F002",
  "correlativo": 48,
  "referencia_interna": "TK-102",
  "fecha_emision": "2026-04-18",
  "moneda": "PEN",
  "tipo_operacion": "0101",
  "forma_pago_tipo": "Contado",
  "client": {
    "tipo_documento": "6",
    "numero_documento": "20123456789",
    "razon_social": "EMPRESA CLIENTE S.A.C."
  },
  "detalles": [
    {
      "codigo": "PROD001",
      "descripcion": "Servicio de consultoria",
      "unidad": "ZZ",
      "cantidad": 1,
      "mto_valor_unitario": 500.00,
      "porcentaje_igv": 18,
      "tip_afe_igv": "10"
    }
  ]
}
```

### 17.6 Respuestas segun escenario

**Creacion exitosa (201):**
```json
{
  "success": true,
  "data": {
    "id": 501,
    "numero_completo": "F002-000048",
    "serie": "F002",
    "correlativo": "000048",
    "referencia_interna": "TK-102",
    "estado_sunat": "EN_COLA",
    ...
  },
  "message": "Factura creada correctamente"
}
```

**Gap detectado (201 con warning):**
Si tu sistema salta del correlativo 48 al 52 (por ejemplo, 49-51 se anularon internamente):
```json
{
  "success": true,
  "data": { "numero_completo": "F002-000052", ... },
  "message": "Factura creada correctamente",
  "warning": "Salto de 3 correlativo(s) detectado (49-51) en serie F002"
}
```
El documento se crea correctamente. El warning es solo informativo. SUNAT tolera gaps.

**Idempotencia - reenvio (200):**
Si envias la misma `referencia_interna` dos veces:
```json
{
  "success": true,
  "data": { ... documento existente ... },
  "message": "Documento existente (idempotente)",
  "idempotent": true
}
```
No se crea duplicado. Se retorna el documento que ya existe.

**Correlativo duplicado (422):**
Si el correlativo ya existe en la tabla:
```json
{
  "success": false,
  "message": "Correlativo F002-000048 ya existe para esta empresa"
}
```

### 17.7 Relleno de gaps (caso SAP IDDH)

Si un correlativo fue emitido con datos incorrectos (serie equivocada, error de datos), tu sistema puede:

1. Anular o eliminar el documento erroneo en tu sistema interno
2. Reenviar el correlativo con los datos correctos a Syncrofact

El sistema acepta cualquier correlativo que **no exista ya en la tabla**, sin importar si es menor al counter actual. Esto permite corregir correlativos mal emitidos, equivalente a la transaccion IDDH de SAP.

```
Counter actual: 62
Correlativo 55 no existe en la tabla (fue anulado/limpiado)
-> POST { correlativo: 55, ... } -> 201 OK (rellena el gap)
-> El counter sigue en 62, no se modifica
```

### 17.8 Endpoints de consulta por referencia

**Consultar un documento por referencia:**
```
GET /v1/integracion/documentos?referencia_interna=TK-102&tipo_documento=01

Respuesta:
{
  "success": true,
  "data": {
    "encontrado": true,
    "id": 501,
    "referencia_interna": "TK-102",
    "numero_completo": "F002-000048",
    "estado_sunat": "ACEPTADO",
    "sunat": { "codigo": "0", "descripcion": "La Factura ha sido aceptada" },
    "total": 590.00,
    "moneda": "PEN"
  }
}
```

**Consulta masiva (hasta 50 referencias):**
```
POST /v1/integracion/batch-status
{
  "tipo_documento": "01",
  "referencias": ["TK-102", "TK-103", "TK-104"]
}

Respuesta:
{
  "success": true,
  "data": [
    { "encontrado": true, "referencia_interna": "TK-102", "numero_completo": "F002-000048", "estado_sunat": "ACEPTADO", "total": 590.00 },
    { "encontrado": true, "referencia_interna": "TK-103", "numero_completo": "F002-000049", "estado_sunat": "ACEPTADO", "total": 236.00 },
    { "encontrado": false, "referencia_interna": "TK-104" }
  ],
  "total": 3,
  "encontrados": 2
}
```

### 17.9 Monitor de correlativos (auditoria)

El sistema tercero puede auditar el estado de sus correlativos comparando su registro interno contra lo que tiene el sistema de facturacion.

**Resumen de series (con gaps):**
```
GET /v1/integracion/series-correlativos

Respuesta por cada serie:
{
  "serie": "F002",
  "tipo_documento": "01",
  "correlativo_actual": 62,
  "cant_bd": 62,          // documentos reales en la tabla
  "gaps": 0,              // diferencia: counter - cant_bd
  "proximo_numero": "F002-000063"
}
```

**Monitor detallado por correlativo:**
```
GET /v1/integracion/monitor-correlativos?tipo_documento=01&serie=F002

Parametros opcionales:
  - desde=50    (correlativo inicial del rango)
  - hasta=62    (correlativo final del rango)
  - branch_id=1 (filtrar por sucursal)

Respuesta:
{
  "success": true,
  "data": {
    "serie": "F002",
    "tipo_documento_nombre": "Factura",
    "correlativo_actual": 62,
    "total_emitidos": 62,
    "total_gaps": 0,
    "integridad": "100%",
    "gaps": [],
    "documentos": [
      {
        "correlativo": 62,
        "numero_completo": "F002-000062",
        "referencia_interna": "TK-062-F002-000062",
        "cliente": {
          "tipo_documento": "6",
          "numero_documento": "20512528458",
          "razon_social": "SISTEMA TERCERO S.A.C."
        },
        "estado_sunat": "ACEPTADO",
        "total": 295.00,
        "moneda": "PEN",
        "origen": "api"
      },
      ...
    ]
  }
}
```

Cada documento muestra el match: `referencia_interna` (ticket del POS) ↔ `numero_completo` (factura SUNAT) ↔ `cliente`. Los gaps aparecen con `estado_sunat: "NO_EMITIDO"`.

### 17.10 Rutas API completas para integracion

```
# === EMISION DE DOCUMENTOS ===
POST /api/v1/invoices            # Crear factura
POST /api/v1/boletas             # Crear boleta
POST /api/v1/credit-notes        # Crear nota de credito
POST /api/v1/debit-notes         # Crear nota de debito
POST /api/v1/dispatch-guides     # Crear guia de remision

# Campos opcionales en todos los POST de emision:
#   "correlativo": 47              -> tu POS asigna el correlativo
#   "referencia_interna": "TK-047" -> tu ID interno para rastreo e idempotencia

# === CONSULTA Y SINCRONIZACION ===
GET  /api/v1/integracion/series-correlativos       # Resumen de series con gaps
GET  /api/v1/integracion/proximo-numero            # Proximo correlativo de una serie
GET  /api/v1/integracion/monitor-correlativos      # Detalle por correlativo con match
GET  /api/v1/integracion/documentos                # Buscar por referencia_interna
POST /api/v1/integracion/batch-status              # Estado masivo por referencias (max 50)

# === DESCARGA DE ARCHIVOS ===
GET  /api/v1/{tipo}/{id}/download-xml              # XML firmado
GET  /api/v1/{tipo}/{id}/download-cdr              # CDR de SUNAT
GET  /api/v1/{tipo}/{id}/download-pdf              # PDF del comprobante
#    {tipo} = invoices | boletas | credit-notes | debit-notes | dispatch-guides

# Todos los endpoints requieren: Authorization: Bearer TU_TOKEN
```

### 17.11 Validaciones del correlativo

| Escenario | Resultado |
|-----------|-----------|
| No envias correlativo | Auto-genera el siguiente (comportamiento por defecto) |
| Correlativo libre (no existe en tabla) | Acepta, sin importar si es mayor o menor al counter |
| Correlativo que ya existe en la tabla | 422: duplicado |
| Correlativo con gap hacia adelante | Acepta con warning informativo. Counter se actualiza |
| Correlativo rellenando gap (menor al counter) | Acepta sin warning. Counter no cambia |

### 17.12 Por que enviar ambos campos es la mejor opcion

1. **`correlativo`** te da control: tu sistema decide el numero, no depende del servidor. Si el servidor cae, sigues vendiendo con tu propia secuencia.

2. **`referencia_interna`** te da seguridad: si un POST falla por timeout pero el servidor si lo proceso, al reenviar con la misma referencia no se duplica. Ademas, puedes consultar el estado de tus documentos usando tu propio ID interno.

3. **Juntos cubren todos los escenarios:**
   - Sistema de facturacion cae -> tu POS asigna correlativos y reenvia cuando vuelve
   - SUNAT cae -> los documentos quedan en cola, tu sistema sabe que correlativos envio
   - Tu propio sistema cae -> al reiniciar, consulta batch-status para saber que se proceso y que no
   - Error de red intermitente -> la idempotencia evita duplicados
   - Correlativo mal emitido -> se limpia y se reutiliza

## 18. Envio automatico de email al cliente

### 18.1 Como funciona

Cuando un documento (factura, boleta, NC, ND, GRE) es **aceptado por SUNAT**, el sistema puede enviar automaticamente un email al cliente con el PDF adjunto.

Para que el email se envie via API, se necesitan **dos condiciones**:

1. **La empresa tiene email activo:** campo `enviar_email_cliente = true` (configurable desde el panel admin)
2. **El request incluye `client.email`:** si tu sistema envia el email del cliente en la peticion, se envia automaticamente

No es necesario que el cliente exista previamente en el sistema. El cliente se crea o actualiza automaticamente al emitir el documento.

### 18.2 Verificar si la empresa tiene email activo

Antes de incluir emails en tus requests, consulta la configuracion:

```
GET /v1/integracion/series-correlativos

Respuesta:
{
  "config": {
    "enviar_email_cliente": true,    // <- si es true, puedes enviar emails
    "email_empresa": "ventas@empresa.com"
  },
  "branches": [...]
}
```

Si `enviar_email_cliente` es `false`, aunque envies `client.email` en el request, el sistema no enviara email.

### 18.3 Enviar email al emitir un documento

Solo incluye el campo `client.email` en tu request:

```json
POST /api/v1/invoices
{
  "company_id": 1,
  "branch_id": 1,
  "serie": "F002",
  "correlativo": 66,
  "referencia_interna": "TK-066",
  "fecha_emision": "2026-04-18",
  "moneda": "PEN",
  "forma_pago_tipo": "Contado",
  "client": {
    "tipo_documento": "6",
    "numero_documento": "20456789012",
    "razon_social": "DISTRIBUIDORA COMERCIAL S.A.C.",
    "email": "compras@distribuidora.com"
  },
  "detalles": [...]
}
```

**Flujo automatico:**
1. Documento se crea y se envia a SUNAT
2. SUNAT acepta el documento
3. El sistema envia email a `compras@distribuidora.com` con el PDF adjunto
4. Todo automatico, sin pasos adicionales

**Si NO quieres enviar email** para una transaccion especifica, simplemente no incluyas `client.email`:

```json
"client": {
  "tipo_documento": "6",
  "numero_documento": "20456789012",
  "razon_social": "DISTRIBUIDORA COMERCIAL S.A.C."
  // sin email -> no se envia correo
}
```

### 18.4 Que recibe el cliente

El email incluye:
- **Remitente:** `"NOMBRE EMPRESA" <noreply@syncrofact.net.pe>`
- **Reply-To:** email de la empresa (si el cliente responde, le llega a la empresa)
- **Asunto:** `Su Factura F002-000066 - NOMBRE EMPRESA`
- **Contenido:** resumen del documento (numero, fecha, items, totales)
- **Adjunto:** PDF del comprobante
- **Enlace:** URL de consulta publica para verificar el documento

### 18.5 Aplica a todos los tipos de documento

El envio de email funciona para:
- Facturas (`POST /v1/invoices`)
- Boletas (`POST /v1/boletas`)
- Notas de Credito (`POST /v1/credit-notes`)
- Notas de Debito (`POST /v1/debit-notes`)
- Guias de Remision (`POST /v1/dispatch-guides`)

### 18.6 Diferencia entre API y panel web

| Origen | Condiciones para enviar email |
|--------|-------------------------------|
| **API** | `empresa.enviar_email_cliente = true` + `client.email` en el request |
| **Web** | `empresa.enviar_email_cliente = true` + `cliente.enviar_email = true` (switch en formulario de clientes) + `cliente.email` |

En API, la decision de enviar email es **por transaccion** (incluyes o no el email). En el panel web, la decision es **por cliente** (switch activado en el formulario del cliente).

---

## 19. Comunicaciones de Baja (anulacion)

### 19.1 Concepto y alcance

Una **Comunicacion de Baja** (resumen tipo `RA`) es el mecanismo oficial de SUNAT para anular comprobantes ya **ACEPTADOS**. No confundir con:

- **Notas de Credito (NC):** corrigen o revierten un comprobante manteniendo trazabilidad contable. Se siguen usando para devoluciones, descuentos posteriores, anulacion por error en RUC, etc.
- **Resumen Diario de Boletas (RC):** mecanismo para informar boletas y notas vinculadas a boletas. **Las anulaciones de boletas (`03`) y de notas vinculadas a boletas (`07` con `BC`, `08` con `BD`) se hacen con estado `3` en el resumen diario, NO con comunicacion de baja.**

**Tipos de documento que SI se anulan via Comunicacion de Baja:**

| Tipo SUNAT | Documento |
|------------|-----------|
| `01` | Factura |
| `07` | Nota de Credito **electronica** (serie `FC...`) |
| `08` | Nota de Debito **electronica** (serie `FD...`) |

**Tipos que NO van por aqui:**

- Boletas (`03`) -> ver [seccion 20: Anulacion de Boletas](#20-anulacion-de-boletas-resumen-diario)
- Notas de credito/debito asociadas a boletas (series `BC...`, `BD...`) -> resumen diario
- Guias de remision (`09`) -> tienen su propio mecanismo de baja en GRE
- Retenciones (`20`) -> no aplica comunicacion de baja

### 19.2 Restricciones SUNAT validadas por la API

El sistema valida **antes** de llegar a SUNAT y devuelve `422` si algo falla. Reglas:

| Validacion | Detalle |
|------------|---------|
| **Plazo** | Solo se anulan documentos emitidos en los ultimos **7 dias calendario** (medido desde `fecha_emision` del documento, no desde hoy) |
| **Tipo doc** | Solo `01`, `07`, `08` |
| **Estado del documento** | Debe tener `estado_sunat = ACEPTADO`. No se pueden anular pendientes ni rechazados |
| **No anulado previamente** | El campo `anulado` del documento debe ser `false` |
| **No baja en curso** | No puede existir otra comunicacion de baja para el mismo documento en estado `PENDIENTE`, `ENVIADO` o `ACEPTADO` |
| **Facturas sin notas** | Una factura con NC/ND **aceptadas** asociadas (`num_doc_afectado`) no puede ir a baja |
| **Sin duplicados en payload** | No repetir el mismo `serie-correlativo` dentro del mismo request |
| **Pertenencia** | `branch_id` debe pertenecer a `company_id`; documentos deben pertenecer a la misma empresa |
| **Maximo por comunicacion** | Hasta **100 documentos** por comunicacion |
| **fecha_referencia** | Obligatoria, no puede ser futura, no puede tener mas de 7 dias de antiguedad |

### 19.3 Endpoints disponibles

> **Prefijo:** `/api/v1/voided-documents`
> **Auth:** Bearer Token (Sanctum). Igual que el resto de la API.

| Metodo | Ruta | Proposito |
|--------|------|-----------|
| `GET` | `/v1/voided-documents` | Listar comunicaciones (con filtros y paginacion) |
| `POST` | `/v1/voided-documents` | Crear comunicacion (paso 1) |
| `POST` | `/v1/voided-documents/{id}/send-sunat` | Enviar a SUNAT y auto-consultar estado (paso 2) |
| `POST` | `/v1/voided-documents/{id}/check-status` | Re-consultar estado por ticket si quedo en `ENVIADO` |
| `GET` | `/v1/voided-documents/{id}` | Detalle de una comunicacion |
| `GET` | `/v1/voided-documents/{id}/download-xml` | XML firmado |
| `GET` | `/v1/voided-documents/{id}/download-cdr` | CDR de SUNAT (solo si `ACEPTADO`) |
| `GET` | `/v1/voided-documents/available-documents` | Listar documentos elegibles para anular en una fecha |
| `GET` | `/v1/voided-documents/reasons` | Catalogo de motivos sugeridos |
| `GET` | `/v1/voided-documents/reasons/categories` | Categorias de motivos |
| `GET` | `/v1/voided-documents/reasons/{codigo}` | Un motivo especifico |

### 19.4 Crear comunicacion de baja

```
POST /api/v1/voided-documents
Authorization: Bearer {token}
Content-Type: application/json
```

**Payload minimo:**

```json
{
  "company_id": 1,
  "branch_id": 1,
  "fecha_referencia": "2026-04-26",
  "motivo_baja": "Anulacion masiva por error administrativo",
  "detalles": [
    {
      "tipo_documento": "01",
      "serie": "F001",
      "correlativo": "00000123",
      "motivo_especifico": "Cliente cancelo la operacion antes de la entrega"
    },
    {
      "tipo_documento": "07",
      "serie": "FC01",
      "correlativo": "00000045",
      "motivo_especifico": "Nota de credito emitida por error sobre factura ya pagada"
    }
  ]
}
```

**Campos:**

| Campo | Tipo | Obligatorio | Detalle |
|-------|------|-------------|---------|
| `company_id` | int | si | Empresa propietaria del documento |
| `branch_id` | int | si | Sucursal (debe pertenecer a la empresa) |
| `fecha_referencia` | date `YYYY-MM-DD` | si | Fecha de emision de los documentos a anular. Se usa como `referenceDate` del XML SUNAT. Maximo 7 dias atras |
| `motivo_baja` | string | si | Motivo general de la comunicacion (max 500 caracteres) |
| `ubl_version` | string | no | `2.0` o `2.1`. Default `2.0` |
| `usuario_creacion` | string | no | Identificador del usuario/sistema que origina la baja (max 100 caracteres). Util para auditoria |
| `detalles` | array | si | 1 a 100 items |
| `detalles.*.tipo_documento` | string | si | `01`, `07` u `08` |
| `detalles.*.serie` | string | si | Max 4 caracteres |
| `detalles.*.correlativo` | string | si | Max 8 caracteres. Se acepta con o sin ceros a la izquierda; el sistema normaliza |
| `detalles.*.motivo_especifico` | string | si | Motivo por documento (max 250 caracteres) |

**Respuesta 201 (success):**

```json
{
  "success": true,
  "data": {
    "id": 17,
    "company_id": 1,
    "branch_id": 1,
    "numero_completo": "RA-20260426-001",
    "serie": "RA-20260426",
    "correlativo": "001",
    "fecha_emision": "2026-04-26",
    "fecha_referencia": "2026-04-26",
    "estado_sunat": "PENDIENTE",
    "respuesta_sunat": null,
    "ticket": null,
    "hash_cdr": null,
    "motivo_baja": "Anulacion masiva por error administrativo",
    "cantidad_documentos": 2,
    "total_documentos": 2,
    "documentos": [
      {
        "tipo_documento": "01",
        "serie": "F001",
        "correlativo": "00000123",
        "numero_completo": "F001-00000123",
        "motivo_especifico": "Cliente cancelo la operacion antes de la entrega"
      },
      {
        "tipo_documento": "07",
        "serie": "FC01",
        "correlativo": "00000045",
        "numero_completo": "FC01-00000045",
        "motivo_especifico": "Nota de credito emitida por error sobre factura ya pagada"
      }
    ],
    "xml_path": null,
    "cdr_path": null,
    "created_at": "2026-04-26T14:32:11Z",
    "updated_at": "2026-04-26T14:32:11Z"
  },
  "message": "Comunicacion de baja creada correctamente"
}
```

**Importante:** crear la comunicacion **NO la envia a SUNAT**. Queda en estado `PENDIENTE` hasta que llames al endpoint `send-sunat`. El campo `id` de la respuesta es el que usaras en los siguientes pasos.

### 19.5 Enviar a SUNAT

```
POST /api/v1/voided-documents/{id}/send-sunat
Authorization: Bearer {token}
```

Sin body. El `{id}` es el de la respuesta del paso anterior.

**Que hace internamente:**
1. Vuelve a validar el plazo de 7 dias contra `fecha_referencia`
2. Genera el XML, lo firma con el certificado de la empresa, lo zipea
3. Envia a SUNAT y recibe un **ticket** (asincrono)
4. Espera 2 segundos y consulta automaticamente el estado del ticket
5. Devuelve el estado final si SUNAT alcanzo a procesar (lo normal: `ACEPTADO` en segundos)

**Respuesta exitosa:**

```json
{
  "success": true,
  "data": {
    "id": 17,
    "numero": "RA-20260426-001",
    "serie": "RA-20260426",
    "correlativo": "001",
    "fecha_emision": "2026-04-26",
    "fecha_referencia": "2026-04-26",
    "ticket": "1762345678901",
    "estado_sunat": "ACEPTADO",
    "total_documentos": 2
  },
  "message": "Comunicacion de baja aceptada por SUNAT",
  "advertencia_plazo": null
}
```

**Posibles `estado_sunat` despues de `send-sunat`:**

| Estado | Significado | Accion |
|--------|-------------|--------|
| `ACEPTADO` | SUNAT confirmo. Los documentos quedaron anulados oficialmente | Descargar CDR si necesitas |
| `ENVIADO` | SUNAT recibio pero aun no procesa el ticket | Llamar `check-status` despues de unos segundos |
| `RECHAZADO` | SUNAT rechazo el lote | Revisar `respuesta_sunat`. La comunicacion no anula nada hasta corregir |
| `PENDIENTE` | Hubo un error de envio (red, certificado, credenciales) | Reintentar `send-sunat` |

**Si el plazo de 7 dias ya vencio**, el endpoint devuelve `400` con `error_code: "PLAZO_VENCIDO"`:

```json
{
  "success": false,
  "message": "El plazo de 7 dias para comunicacion de baja ha vencido",
  "data": {
    "id": 17,
    "fecha_referencia": "2026-04-15",
    "dias_transcurridos": 11,
    "plazo_maximo": 7,
    "fecha_limite": "2026-04-22"
  },
  "error_code": "PLAZO_VENCIDO"
}
```

En ese caso, la baja ya no es viable; tendras que emitir una **Nota de Credito** para revertir el efecto contable.

### 19.6 Consultar estado del ticket

Si `send-sunat` devolvio `estado_sunat: "ENVIADO"` (SUNAT no termino de procesar), puedes consultar el estado nuevamente:

```
POST /api/v1/voided-documents/{id}/check-status
Authorization: Bearer {token}
```

Sin body. Devuelve el mismo shape que `send-sunat`. Tipicamente termina en `ACEPTADO` en menos de un minuto.

### 19.7 Descargar XML y CDR

```
GET /api/v1/voided-documents/{id}/download-xml
GET /api/v1/voided-documents/{id}/download-cdr
```

- **XML:** disponible desde el primer envio (cualquier estado != `PENDIENTE`)
- **CDR:** disponible solo cuando `estado_sunat == ACEPTADO`

Devuelven el archivo como descarga directa (`application/xml` y `application/zip` respectivamente).

### 19.8 Listar comunicaciones existentes

```
GET /api/v1/voided-documents
GET /api/v1/voided-documents?estado_sunat=ACEPTADO&fecha_desde=2026-04-01&fecha_hasta=2026-04-30
GET /api/v1/voided-documents?search=F001-00000123
```

**Filtros:**

| Parametro | Detalle |
|-----------|---------|
| `branch_id` | Filtrar por sucursal |
| `estado_sunat` | `PENDIENTE`, `ENVIADO`, `ACEPTADO`, `RECHAZADO` |
| `fecha_desde`, `fecha_hasta` | Rango por `fecha_emision` de la comunicacion |
| `fecha_referencia` | Filtrar por la fecha de los documentos anulados |
| `serie`, `numero` | Buscar por serie o numero parcial de la comunicacion (ej. `RA-20260426`) |
| `search` | Busqueda libre: numero completo, ticket, motivo, serie/correlativo de un documento anulado |
| `per_page` | Paginacion (default 15) |

> **Seguridad:** la API fuerza `company_id` al usuario autenticado. Un token no puede listar comunicaciones de otra empresa.

### 19.9 Buscar documentos elegibles para anular

Util si tu sistema necesita ofrecer un selector. La API te dice que documentos de una fecha cumplen TODAS las restricciones:

```
GET /api/v1/voided-documents/available-documents
  ?company_id=1
  &branch_id=1
  &fecha_referencia=2026-04-26
  &tipo_documento=01            (opcional: filtrar solo facturas)
  &agrupar_por_tipo=true        (opcional)
```

Respuesta incluye `dentro_del_plazo`, `dias_transcurridos`, `plazo_restante` y la lista de documentos. Si no estas dentro del plazo, igual los devuelve pero con `advertencia`.

### 19.10 Catalogo de motivos sugeridos

El sistema mantiene un catalogo de motivos comunes (se puede usar como `motivo_especifico` o como guia para tu UI). No es obligatorio usar exactamente estos textos, son sugerencias normalizadas.

```
GET /api/v1/voided-documents/reasons
GET /api/v1/voided-documents/reasons?categoria=ERROR_CALCULO
GET /api/v1/voided-documents/reasons?search=cliente
GET /api/v1/voided-documents/reasons?agrupar_por_categoria=true
GET /api/v1/voided-documents/reasons/{codigo}
```

**Categorias disponibles** (`GET /reasons/categories`):

| Codigo | Nombre |
|--------|--------|
| `ERROR_DATOS_CLIENTE` | Errores en Datos del Cliente |
| `ERROR_DESCRIPCION` | Errores en Descripcion de Productos/Servicios |
| `ERROR_CALCULO` | Errores en Calculos |
| `ERROR_TRIBUTARIO` | Errores Tributarios |
| `ERROR_ADMINISTRATIVO` | Errores Administrativos |
| `OPERACION_NO_REALIZADA` | Operacion No Realizada |
| `ERROR_DOCUMENTO` | Errores en Documento Fisico |
| `ERROR_PAGO` | Errores en Datos de Pago |
| `OTROS` | Otros Motivos |

### 19.11 Errores comunes (422)

Todos vienen del request `POST /v1/voided-documents`. La respuesta sigue el patron Laravel:

```json
{
  "message": "...",
  "errors": {
    "campo": ["mensaje"]
  }
}
```

| Mensaje tipico | Causa | Como corregirlo |
|----------------|-------|------------------|
| `Solo se pueden anular documentos de los ultimos 7 dias` | `fecha_referencia` con mas de 7 dias | Usar Nota de Credito en vez de baja |
| `Tipo de documento invalido. Solo se permiten Facturas (01), Notas de Credito (07) y Notas de Debito (08)` | Mandaste `03`, `09`, etc | Boletas: usar resumen diario. GRE: mecanismo propio |
| `El documento {n} no existe en el sistema o no pertenece a esta empresa` | Serie/correlativo no encontrado o cross-tenant | Verificar `company_id` y los datos del documento |
| `El documento {n} no esta ACEPTADO por SUNAT (Estado actual: ...)` | Documento aun pendiente o rechazado | Esperar a que SUNAT acepte primero, o no anular si fue rechazado |
| `El documento {n} ya esta anulado` | Ya anulado previamente | No reintentar |
| `El documento {n} ya tiene una comunicacion de baja PENDIENTE/ENVIADA/ACEPTADA` | Hay un proceso de baja en curso | Si esta `PENDIENTE` o `ENVIADO`, completar ese flujo. Si esta `ACEPTADO`, ya esta anulado |
| `La factura {n} tiene Notas de Credito asociadas. No se puede anular con comunicacion de baja` | Factura con NC aceptada | La NC ya cumple el rol de anulacion |
| `Documento duplicado en la lista: {serie}-{correlativo}` | Repetido en `detalles[]` | Eliminar duplicado |
| `La sucursal no pertenece a la empresa seleccionada` | `branch_id` invalido para `company_id` | Revisar relacion |
| `Se requiere al menos un documento para anular` / `No se pueden anular mas de 100 documentos` | Array vacio o > 100 | Ajustar tamano del lote |

### 19.12 Flujo recomendado paso a paso

```
1. (Opcional) Tu sistema lista documentos a anular
   GET /v1/voided-documents/available-documents?fecha_referencia=...

2. Crear la comunicacion
   POST /v1/voided-documents
   -> guardar el `id` de la respuesta

3. Enviar a SUNAT
   POST /v1/voided-documents/{id}/send-sunat
   -> revisar estado_sunat

4. Si estado_sunat == "ENVIADO" (caso poco frecuente)
   POST /v1/voided-documents/{id}/check-status
   -> reintentar hasta ACEPTADO o RECHAZADO

5. Si estado_sunat == "ACEPTADO"
   GET /v1/voided-documents/{id}/download-cdr   (opcional, para tu archivo)
   -> documentos quedan anulados oficialmente

6. Si estado_sunat == "RECHAZADO"
   Revisar `respuesta_sunat` para entender el motivo y volver a empezar
   con datos corregidos (los documentos NO quedaron anulados)
```

### 19.13 Webhooks emitidos

Si tienes configurado el [sistema de webhooks](./webhooks.md), las bajas disparan eventos:

| Evento | Cuando |
|--------|--------|
| `voided_document.sent` | Inmediatamente despues de un `send-sunat` exitoso (haya respuesta o no) |
| `voided_document.processed` | Cuando `check-status` devuelve un estado distinto a `ACEPTADO` |
| `voided_document.accepted` | Cuando `check-status` confirma `ACEPTADO` |

Payload del webhook incluye: `document_id`, `numero`, `serie`, `correlativo`, `fecha_emision`, `fecha_referencia`, `ticket`, `estado_sunat`, `total_documentos`.

### 19.14 Que pasa con los documentos anulados

Cuando una comunicacion queda en `ACEPTADO`:

- Cada documento referenciado en `detalles[]` se marca con `anulado = true` en la base de datos
- En las consultas API (ej. `GET /v1/invoices/{id}`) el documento mantiene su `estado_sunat = ACEPTADO` original (asi lo registro SUNAT) **mas** el flag `anulado = true`
- Para consultar oficialmente: la baja figura en SUNAT bajo el resumen `RA-YYYYMMDD-NNN`. El CDR es la prueba legal de anulacion

### 19.15 Cuando NO usar Comunicacion de Baja

| Caso | Mecanismo correcto |
|------|--------------------|
| Anular boleta de venta | Resumen Diario con estado `3` |
| Anular nota de credito/debito de boleta (`BC...`, `BD...`) | Resumen Diario |
| Devolucion parcial al cliente | Nota de Credito (motivo `06` - Devolucion total/parcial) |
| Cliente pide cambio de RUC en factura | Nota de Credito (motivo `02` - Anulacion por error en RUC) |
| Documento con mas de 7 dias | Nota de Credito |
| Factura ya pagada y aceptada por el cliente | Nota de Credito (no baja) |
| Anular Guia de Remision | Endpoint propio de GRE (no `voided-documents`) |

---

## 20. Anulacion de Boletas (Resumen Diario)

### 20.1 Concepto

Las **boletas de venta** (`tipo_documento = 03`) **no se anulan con Comunicacion de Baja (RA)**. SUNAT exige que se anulen mediante un **Resumen Diario** (`RC`) con `estado = 3` para cada boleta a anular.

Esta seccion describe el flujo completo para que un sistema tercero pueda anular boletas via API. La diferencia con la seccion 19:

| Aspecto | Boleta (`03`) | Factura / NC-FC / ND-FD |
|---------|---------------|-------------------------|
| Mecanismo | Resumen Diario `RC` con estado `3` | Comunicacion de Baja `RA` |
| Endpoint | `/v1/boletas/anular-oficialmente` | `/v1/voided-documents` |
| Plazo | **3 dias** desde `fecha_emision` (regla del sistema, mas estricto que SUNAT) | 7 dias calendario |
| Procesamiento SUNAT | Asincrono (ticket) | Asincrono (ticket) |
| Resultado en boleta | `estado_sunat=ANULADO`, `estado_anulacion=anulada` | Documento queda con `anulado=true` |

> **Importante:** No importa si la boleta fue emitida por API (individual) o desde el panel web (resumen). Para anularla se usa siempre este flujo. El sistema reconcilia el estado automaticamente cuando SUNAT acepta el RC.

### 20.2 Restricciones validadas por la API

El sistema valida **antes** de crear el RC y devuelve `400` si algo falla:

| Validacion | Detalle |
|------------|---------|
| **Plazo** | Solo boletas con `fecha_emision` dentro de los ultimos **3 dias calendario**. Pasado ese plazo, usar anulacion local (no oficial) o reemitir |
| **Estado SUNAT** | La boleta debe tener `estado_sunat = ACEPTADO`. No se anulan pendientes ni rechazadas |
| **No anulada localmente** | `anulada_localmente` debe ser `false` |
| **No en proceso** | `estado_anulacion` debe ser `sin_anular` (no `pendiente_anulacion` ni `anulada`) |
| **Misma fecha** | Todas las boletas del mismo request deben compartir `fecha_emision`. Si tenes boletas de fechas distintas, hace un request por fecha |
| **Pertenencia** | `branch_id` debe pertenecer a `company_id` y las boletas deben pertenecer a esa sucursal |

### 20.3 Endpoints disponibles

> **Auth:** Bearer Token (Sanctum). Igual que el resto de la API.

**Anulacion de boletas (`tipo_documento=03`, serie `B*`):**

| Metodo | Ruta | Proposito |
|--------|------|-----------|
| `GET` | `/v1/boletas/anulables` | Listar boletas elegibles (dentro del plazo, ACEPTADAS, sin anular) |
| `POST` | `/v1/boletas/anular-oficialmente` | Crear RC de anulacion (paso 1) |
| `POST` | `/v1/daily-summaries/{id}/send-sunat` | Enviar RC a SUNAT y auto-consultar estado (paso 2) |
| `POST` | `/v1/daily-summaries/{id}/check-status` | Re-consultar estado por ticket si quedo en `ENVIADO` |
| `GET` | `/v1/daily-summaries/{id}` | Detalle del RC |
| `GET` | `/v1/boletas/pendientes-anulacion` | Listar boletas con `estado_anulacion = pendiente_anulacion` |
| `GET` | `/v1/boletas/anuladas` | Listar boletas ya anuladas |
| `GET` | `/v1/boletas/{id}` | Ver estado actual de una boleta especifica |

**Anulacion de NC/ND vinculadas a boleta (`07` con `BC*`, `08` con `BD*`):**

| Metodo | Ruta | Proposito |
|--------|------|-----------|
| `POST` | `/v1/credit-notes/anular-oficialmente` | Crear RC para anular NC vinculadas a boleta |
| `POST` | `/v1/debit-notes/anular-oficialmente` | Crear RC para anular ND vinculadas a boleta |

> **Importante:** Estos dos endpoints SOLO aceptan notas con `tipo_doc_afectado=03` (vinculadas a boleta). Para NC/ND vinculadas a factura (`FC*`, `FD*`) usar la **Comunicacion de Baja** (seccion 19). Si intentas mezclar, la API responde `400`.

Tras crear el RC, los pasos 2 a 5 (envio, check-status, verificacion) son **identicos** al flujo de boletas: el `id` retornado se usa contra `/v1/daily-summaries/{id}/...`.

### 20.4 Listar boletas anulables

```
GET /api/v1/boletas/anulables?company_id=1&branch_id=1
Authorization: Bearer {token}
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "total_boletas": 2,
    "monto_total": 850.00,
    "por_fecha": [
      {
        "fecha_emision": "2026-04-29",
        "total_boletas": 2,
        "monto_total": 850.00,
        "dias_restantes": 3,
        "urgente": false,
        "boletas": [
          {
            "id": 14,
            "numero_completo": "B002-00000011",
            "fecha_emision": "2026-04-29",
            "total": 700.00,
            "dias_restantes": 3,
            "urgente": false,
            "fecha_limite_anulacion": "2026-05-02"
          },
          {
            "id": 15,
            "numero_completo": "B002-00000012",
            "fecha_emision": "2026-04-29",
            "total": 150.00,
            "dias_restantes": 3,
            "urgente": false,
            "fecha_limite_anulacion": "2026-05-02"
          }
        ]
      }
    ]
  }
}
```

`urgente = true` cuando `dias_restantes <= 1`.

### 20.5 Crear el Resumen Diario de anulacion

Hay **dos formatos** soportados. Usa el que mejor se adapte a tu UI.

#### Formato A: motivo unico para todas las boletas

```
POST /api/v1/boletas/anular-oficialmente
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "company_id": 1,
  "branch_id": 1,
  "boletas_ids": [14, 15],
  "motivo_anulacion": "Error de operador al cierre de caja"
}
```

#### Formato B: motivo individual por boleta

```json
{
  "company_id": 1,
  "branch_id": 1,
  "boletas": [
    { "id": 14, "motivo": "Cliente cancelo la operacion" },
    { "id": 15, "motivo": "Error en cantidad facturada" }
  ]
}
```

#### Campos

| Campo | Tipo | Obligatorio | Detalle |
|-------|------|-------------|---------|
| `company_id` | int | si | ID de la empresa emisora |
| `branch_id` | int | si | ID de la sucursal donde se emitieron las boletas |
| `boletas_ids` | int[] | si (formato A) | IDs de las boletas a anular. Excluyente con `boletas` |
| `motivo_anulacion` | string (max 100) | si (formato A) | Motivo aplicado a todas las boletas del lote |
| `boletas` | object[] | si (formato B) | Array `{id, motivo}` por boleta. Excluyente con `boletas_ids` |
| `boletas[].id` | int | si (formato B) | ID de la boleta |
| `boletas[].motivo` | string (max 100) | si (formato B) | Motivo individual |
| `usuario_id` | int | no | ID del usuario que solicita la anulacion (para auditoria) |

#### Respuesta 200

```json
{
  "success": true,
  "data": {
    "summary": {
      "id": 23,
      "numero_completo": "RC-20260429-001",
      "fecha_resumen": "2026-04-29",
      "estado_proceso": "GENERADO",
      "estado_sunat": "PENDIENTE"
    },
    "boletas_count": 2,
    "boletas_ids": [14, 15]
  },
  "message": "Resumen de anulacion creado exitosamente. Use POST /api/v1/daily-summaries/23/send-sunat para enviar a SUNAT."
}
```

A partir de aca:
- Las boletas quedan marcadas con `estado_anulacion = pendiente_anulacion` y `daily_summary_id = 23`
- El RC se crea con estado `PENDIENTE` (todavia no enviado a SUNAT)

### 20.6 Enviar el RC a SUNAT

```
POST /api/v1/daily-summaries/23/send-sunat
Authorization: Bearer {token}
```

El servidor envia el XML firmado a SUNAT, recibe un **ticket** y luego auto-consulta el estado tras ~2 segundos. La respuesta puede llegar con cualquiera de estos escenarios:

#### Caso A: Aceptado en la primera consulta

```json
{
  "success": true,
  "data": {
    "id": 23,
    "numero_completo": "RC-20260429-001",
    "estado_proceso": "COMPLETADO",
    "estado_sunat": "ACEPTADO",
    "ticket": "1777507639947",
    "respuesta_sunat": {
      "code": "0",
      "description": "El Resumen diario RC-20260429-001, ha sido aceptado"
    }
  }
}
```

En este momento, **automaticamente** las boletas pasan a:
- `estado_sunat = ANULADO`
- `estado_anulacion = anulada`
- `respuesta_sunat` con el codigo y descripcion de SUNAT

#### Caso B: SUNAT aun no ha procesado

```json
{
  "success": true,
  "data": {
    "id": 23,
    "estado_proceso": "ENVIADO",
    "estado_sunat": "PROCESANDO",
    "ticket": "1777507639947"
  },
  "message": "Resumen enviado. SUNAT aun procesando, consulte estado nuevamente en unos segundos"
}
```

En este caso, hay que volver a consultar el estado (siguiente paso).

### 20.7 Re-consultar estado del RC

Solo necesario si quedo en `ENVIADO` / `PROCESANDO`:

```
POST /api/v1/daily-summaries/23/check-status
Authorization: Bearer {token}
```

**Recomendacion:** reintentar cada 30-60 segundos hasta que `estado_sunat in [ACEPTADO, RECHAZADO]`. SUNAT normalmente procesa en menos de 2 minutos. Si tras 5 minutos sigue procesando, esperar mas tiempo (puede tardar hasta 7 dias en casos extremos por carga de SUNAT).

### 20.8 Verificar resultado en la boleta

Una vez `estado_sunat = ACEPTADO` en el RC, la boleta queda actualizada automaticamente. Para confirmarlo:

```
GET /api/v1/boletas/14
Authorization: Bearer {token}
```

Campos esperados tras aceptacion:

```json
{
  "id": 14,
  "numero_completo": "B002-00000011",
  "estado_sunat": "ANULADO",
  "estado_anulacion": "anulada",
  "motivo_anulacion": "Cliente cancelo la operacion",
  "fecha_solicitud_anulacion": "2026-04-29 14:32:10",
  "daily_summary_id": 23,
  "respuesta_sunat": {
    "message": "Anulado mediante Resumen Diario",
    "summary_id": 23,
    "summary_ticket": "1777507639947",
    "code": "0",
    "description": "El Resumen diario RC-20260429-001, ha sido aceptado",
    "fecha_anulacion": "2026-04-29 14:33:02"
  }
}
```

### 20.9 Webhooks emitidos

Si tenes webhooks suscritos, recibes los siguientes eventos durante el flujo:

| Evento | Cuando | Payload destacado |
|--------|--------|-------------------|
| `daily_summary.created` | Al crear el RC (paso 20.5) | `id`, `numero_completo`, `estado_sunat=PENDIENTE` |
| `daily_summary.sent` | Al enviar a SUNAT (paso 20.6) | `id`, `ticket` |
| `daily_summary.processed` | Cuando SUNAT responde (cualquier estado distinto de PENDIENTE) | `id`, `estado_sunat` (`ACEPTADO` o `RECHAZADO`), `respuesta_sunat` |

> **Nota:** `daily_summary.processed` se dispara para cualquier estado distinto a `PENDIENTE`. El integrador debe revisar `estado_sunat` en el payload para distinguir aceptaciones de rechazos. No existe un evento `daily_summary.rejected` separado.

Por simplicidad, no hay webhook por cada boleta anulada. La fuente de verdad es el RC: si esta `ACEPTADO`, todas sus boletas de anulacion estan oficialmente anuladas.

### 20.10 Errores comunes

| HTTP | Mensaje | Causa | Solucion |
|------|---------|-------|----------|
| `400` | `La boleta {n} no esta aceptada por SUNAT...` | Intentando anular una boleta `PENDIENTE` o `RECHAZADA` | Esperar a que SUNAT acepte primero |
| `400` | `La boleta {n} ya esta pendiente_anulacion` | Reintentando anular una boleta que ya esta en otro RC en curso | Consultar el RC en curso (`/v1/boletas/{id}` -> `daily_summary_id`) |
| `400` | `La boleta {n} ya esta anulada` | Reintento de un caso ya completado | Idempotencia del lado del integrador: verificar antes de enviar |
| `400` | `La boleta {n} esta fuera del plazo de 3 dias` | Pasaron mas de 3 dias desde `fecha_emision` | Usar anulacion local (`POST /v1/boletas/anular-localmente`); ya no es posible la anulacion oficial via SUNAT |
| `400` | `Las boletas seleccionadas tienen diferentes fechas de emision` | Mezclando boletas de distintos dias en el mismo RC | Hacer un RC por fecha |
| `404` | `No se encontraron boletas para anular` | IDs no existen, no son de la `company_id`/`branch_id` indicada | Validar IDs y pertenencia |
| `422` | `The boletas_ids field is required when boletas is not present` | Payload sin formato A ni B | Enviar uno de los dos formatos |

### 20.11 Flujo recomendado paso a paso

```
1. (Opcional) GET /v1/boletas/anulables                        -> ver elegibles
2. POST /v1/boletas/anular-oficialmente                        -> crea RC (paso 20.5)
   Response: { summary.id: 23, summary.numero_completo: "RC-20260429-001" }
3. POST /v1/daily-summaries/23/send-sunat                      -> envia a SUNAT (paso 20.6)
4. Si estado_sunat == "PROCESANDO":
   POST /v1/daily-summaries/23/check-status (cada 30-60s)      -> hasta ACEPTADO o RECHAZADO
5. GET /v1/boletas/14                                          -> verificar estado_sunat=ANULADO
6. (Opcional) Recibir webhook daily_summary.processed con estado_sunat=ACEPTADO
```

### 20.12 Consideraciones

- **Idempotencia:** No hay campo `referencia_interna` en este flujo (a diferencia de la emision). Si tu sistema reintenta el `POST /anular-oficialmente`, la segunda llamada va a fallar con `400` porque las boletas ya estan en `pendiente_anulacion`. Esto es deseable: previene duplicados.
- **Anulacion local vs oficial:** Si la boleta tiene mas de 3 dias, no podes anular oficialmente. Usar `POST /v1/boletas/anular-localmente` que solo marca el flag interno (`anulada_localmente=true`). Esa anulacion **no se reporta a SUNAT** y la boleta sigue figurando como ACEPTADA en SUNAT. Es solo para tu contabilidad interna.
- **Boletas emitidas por API (individuales):** Funciona igual que las emitidas por panel. El sistema reconcilia el estado de cualquier boleta ligada al RC, sin importar el `metodo_envio` original.
- **Maximo por RC:** No hay un limite duro en API, pero por buenas practicas no enviar mas de 100 boletas por RC.
- **CDR como prueba legal:** Una vez `ACEPTADO`, descargar el CDR via `GET /v1/daily-summaries/23/download-cdr` y archivarlo. Es la prueba legal de la anulacion ante SUNAT.

### 20.13 Ejemplo end-to-end con curl

```bash
BASE="https://api-beta.syncrofact.net.pe/api"
TOKEN="tu-bearer-token"

# 1. Listar boletas anulables
curl "$BASE/v1/boletas/anulables?company_id=1&branch_id=1" \
  -H "Authorization: Bearer $TOKEN"

# 2. Crear RC de anulacion
SUMMARY_ID=$(curl -s -X POST "$BASE/v1/boletas/anular-oficialmente" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 1,
    "branch_id": 1,
    "boletas_ids": [14],
    "motivo_anulacion": "Error de cliente"
  }' | jq -r '.data.summary.id')

# 3. Enviar a SUNAT (auto check-status incluido)
curl -X POST "$BASE/v1/daily-summaries/$SUMMARY_ID/send-sunat" \
  -H "Authorization: Bearer $TOKEN"

# 4. (Si quedo PROCESANDO) re-check estado
curl -X POST "$BASE/v1/daily-summaries/$SUMMARY_ID/check-status" \
  -H "Authorization: Bearer $TOKEN"

# 5. Verificar estado de la boleta
curl "$BASE/v1/boletas/14" \
  -H "Authorization: Bearer $TOKEN" | jq '.estado_sunat, .estado_anulacion'
# Esperado: "ANULADO"  "anulada"
```

### 20.14 Anular NC/ND vinculadas a boleta

Las **notas de credito** con serie `BC*` y **notas de debito** con serie `BD*` (`tipo_doc_afectado=03`) **no pueden anularse** con Comunicacion de Baja (RA): SUNAT rechaza con error `2310` porque su patron solo cubre `F*/FC*/FD*`. Se anulan con un Resumen Diario `RC` con `estado=3`, igual que las boletas, pero con `tipo_documento=07` o `08` y un `BillingReference` apuntando a la boleta original.

Esto lo arma el sistema automaticamente: tu solo invocas el endpoint con los IDs de las notas. Aplican las mismas restricciones que para boletas (plazo 3 dias, ACEPTADO, no anulada, misma fecha).

#### 20.14.1 Anular Notas de Credito

```bash
POST /api/v1/credit-notes/anular-oficialmente
Authorization: Bearer {token}
Content-Type: application/json
```

**Formato 1 - motivo unico para todas:**

```json
{
  "company_id": 1,
  "branch_id": 1,
  "nota_credito_ids": [42, 43],
  "motivo_anulacion": "Anulacion por error en items"
}
```

**Formato 2 - motivo individual:**

```json
{
  "company_id": 1,
  "branch_id": 1,
  "notas": [
    {"id": 42, "motivo": "Error en RUC"},
    {"id": 43, "motivo": "Anulacion de la operacion"}
  ]
}
```

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "id": 28,
      "numero_completo": "RC-20260501-003",
      "fecha_resumen": "2026-05-01",
      "fecha_generacion": "2026-05-01",
      "correlativo": "003",
      "estado_proceso": "GENERADO",
      "estado_sunat": "PENDIENTE"
    },
    "notas_count": 2,
    "notas_ids": [42, 43]
  },
  "message": "Resumen de anulación creado exitosamente. Use POST /api/v1/daily-summaries/28/send-sunat para enviar a SUNAT."
}
```

**Errores comunes (`400`):**

| Mensaje | Causa |
|---------|-------|
| `La NC FC02-... está vinculada a una factura` | Intentaste anular una NC con `tipo_doc_afectado=01`. Usar Comunicacion de Baja (seccion 19) |
| `La NC ... no está aceptada por SUNAT` | NC en `PENDIENTE`, `RECHAZADO`, `PROCESANDO`. Solo aceptadas |
| `está fuera del plazo de 3 días` | Plazo vencido. Usar anulacion local |
| `ya está pendiente_anulacion` | Idempotencia: la NC ya tiene un RC en curso |

#### 20.14.2 Anular Notas de Debito

Identico al anterior, cambiando `nota_credito_ids` por `nota_debito_ids` y la ruta:

```bash
POST /api/v1/debit-notes/anular-oficialmente
```

#### 20.14.3 Flujo end-to-end (NC de boleta)

```bash
BASE="https://api-beta.syncrofact.net.pe/api"
TOKEN="tu-bearer-token"

# 1. Crear RC de anulacion (la NC debe ser BC*, ya aceptada, dentro de 3 dias)
SUMMARY_ID=$(curl -s -X POST "$BASE/v1/credit-notes/anular-oficialmente" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 1,
    "branch_id": 1,
    "nota_credito_ids": [42],
    "motivo_anulacion": "Error en items"
  }' | jq -r '.data.summary.id')

# 2. Enviar a SUNAT (auto check-status incluido)
curl -X POST "$BASE/v1/daily-summaries/$SUMMARY_ID/send-sunat" \
  -H "Authorization: Bearer $TOKEN"

# 3. (Si quedo PROCESANDO) re-check
curl -X POST "$BASE/v1/daily-summaries/$SUMMARY_ID/check-status" \
  -H "Authorization: Bearer $TOKEN"

# 4. Verificar estado de la NC
curl "$BASE/v1/credit-notes/42" \
  -H "Authorization: Bearer $TOKEN" | jq '.estado_sunat, .estado_anulacion'
# Esperado: "ANULADO"  "anulada"
```

#### 20.14.4 Que hace el sistema internamente

Al aceptar SUNAT el RC:

1. La NC pasa a `estado_sunat=ANULADO` y `estado_anulacion=anulada`.
2. Se rellena `fecha_anulacion` con el momento del CDR.
3. `respuesta_sunat` queda con `code`, `description`, `summary_id` y `summary_ticket` para auditoria.

Si SUNAT **rechaza** el RC: las notas vuelven a `estado_anulacion=sin_anular` y se desligan del summary, asi puedes corregir el motivo y reintentar. El error queda registrado en `respuesta_sunat`.

#### 20.14.5 Webhooks

Iguales a los de boletas: `daily_summary.created`, `daily_summary.sent`, `daily_summary.processed`. El payload del summary incluye los `notas_ids` afectadas, asi tu sistema puede correlacionar el resultado.

---

## Limites y Consideraciones

- **Rate limit:** No hay limite actual, pero se recomienda no exceder 60 requests/minuto
- **Timeout:** Las peticiones tienen timeout de 60 segundos
- **Tamano maximo:** 20MB por request
- **Bancarizacion:** Obligatoria para montos > S/ 3,500 PEN o US$ 1,000 USD en pagos al contado
- **Boleta con DNI:** Montos > S/ 700 PEN requieren DNI real del cliente
- **Correlativo:** Se genera automaticamente o se acepta del integrador (ver seccion 17)
- **Envio SUNAT:** Automatico al crear. El documento entra en cola y se envia en segundos
- **Calculos:** IGV, totales y leyendas se calculan automaticamente en el servidor
