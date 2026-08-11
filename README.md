# Gestor de Finanzas

Aplicación web personal para llevar el control de gastos e ingresos. Multiusuario
con acceso restringido, movimientos automáticos, control de deudas y gráficas.

```
┌─────────────┬─────────────┬─────────────┐
│ Saldo       │ Ingresos    │ Gastos    ▲ │
│ 2.915,70 €  │ 1800,00 €   │ 2087,30 €   │
├─────────────┴─────────────┴─────────────┤
│ Te deben 16,00 €    No cuenta en saldo →│
├────────────────┬────────────────────────┤
│ Nuevo          │ Movimientos            │
│ movimiento     │ Alquiler     -850,00 € │
│ [Gasto]        │ Nómina     +1.800,00 € │
│ [Ingreso]      │ Netflix       -13,99 € │
│ [Ajuste]       │ …                      │
├────────────────┴───┬────────────────────┤
│ Evolución del saldo│ Ingresos y gastos  │
│      ╱‾‾╲___╱‾‾    │  ▌▌  ▌▌  ▌▌  ▌▌    │
└────────────────────┴────────────────────┘
```

---

## Índice

| Documento | Qué encontrarás |
|---|---|
| **[Arquitectura](docs/arquitectura.md)** | Cómo está montado y por qué. Server Components, Server Actions, mapa de carpetas |
| **[Base de datos](docs/base-de-datos.md)** | Las tablas, las relaciones y las decisiones de diseño |
| **[Funcionalidades](docs/funcionalidades.md)** | Qué hace cada pantalla, con detalle |
| **[Seguridad](docs/seguridad.md)** | Análisis completo: qué se comprobó, qué se corrigió |
| **[Despliegue](docs/despliegue.md)** | Paso a paso para publicarlo gratis en Vercel + Turso |
| **[Desarrollo](docs/desarrollo.md)** | Comandos, trampas conocidas y cómo añadir funcionalidades |

---

## Arrancar en un minuto

```bash
npm install
cp .env.example .env        # y rellena BETTER_AUTH_SECRET
npx prisma migrate dev
npm run crear-admin -- tu@correo.com
npm run dev
```

Abre `http://localhost:3000` y entra con el correo y la contraseña que imprime el
script.

Para generar el secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Qué hace

### Movimientos

Tres tipos: **gasto**, **ingreso** y **ajuste**. El ajuste sirve para fijar el
saldo inicial o corregir un descuadre, así no hace falta un campo aparte: el
punto de partida es un movimiento más.

Se pueden **editar** en línea y **borrar** con confirmación en la propia fila.

### Movimientos automáticos

Reglas que generan gastos o ingresos solos, cada mes:

| | Suma o resta | Termina |
|---|---|---|
| **Suscripción** — Netflix, gimnasio | Resta | No, hasta cancelarla |
| **Financiación** — un préstamo, un sofá a plazos | Resta | Sí, al pagar la última cuota |
| **Ingreso** — la nómina | Suma | No, hasta cancelarlo |

Las financiaciones calculan la cuota con la fórmula de amortización francesa
(admite interés), y **se apagan solas** al llegar a la última.

### Deudas

Para el caso de *«he pagado 24 € pero me deben 16»*. Funciona en las dos
direcciones y admite cobros parciales.

### Gráficas

Evolución del saldo y comparación de ingresos y gastos por mes. Con tooltip,
tabla de datos equivalente y colores elegidos para que se distingan también con
daltonismo.

### Usuarios

Login obligatorio, **sin registro público**. Un administrador crea las cuentas,
cambia contraseñas, desactiva y borra. Las finanzas de cada usuario son privadas:
ni el administrador puede verlas.

---

## Las tres ideas que explican el resto

### 1. El saldo es la suma de los movimientos

No hay ningún campo `saldo` guardado. Se calcula siempre. Un saldo guardado se
desincroniza en cuanto algo falla a medias; uno calculado **no puede mentir**.

Todo lo demás respeta esta regla: una suscripción no es un movimiento (genera
movimientos), y una deuda tampoco (solo al cobrarla se crea uno).

### 2. El dinero se guarda en céntimos enteros

`25,50 €` se almacena como `2550`. Nunca decimales: en coma flotante
`0.1 + 0.2` da `0.30000000000000004`, y con dinero eso son céntimos que se
pierden.

El importe lleva signo —los gastos son negativos—, así el saldo es una suma
sencilla.

### 3. Una deuda no es dinero que tengas

Si pagas 24 € y te deben 16, de tu cuenta salieron 24 y eso es lo que baja el
saldo. Los 16 se anotan aparte. Solo cuando te los devuelven se crea un ingreso
de verdad.

```
Saldo actual        lo que tienes hoy
Te deben            lo que volvería
Si se salda todo    cómo quedarías
```

---

## Tecnologías

| | |
|---|---|
| **Next.js 16** + React 19 | Framework y interfaz |
| **TypeScript** | Tipos en todo el proyecto |
| **Tailwind CSS v4** | Estilos |
| **Prisma 7** | Acceso a la base de datos |
| **SQLite** / **Turso** | Base de datos, local y en producción |
| **Better Auth** | Login, sesiones y roles |
| **Recharts** | Gráficas |

Sin backend separado: Next.js sirve las páginas y ejecuta la lógica de servidor.
No hay ni un solo `fetch` en el proyecto — los formularios usan **Server
Actions**.

---

## Seguridad, en corto

Revisión completa el 11 de agosto de 2026. **0 vulnerabilidades** en
dependencias, **0 fallos críticos**.

Lo que protege la aplicación:

- **Sin registro público.** Nadie puede crearse una cuenta.
- **Toda acción comprueba la sesión en el servidor**, no solo al pintar la página.
- **Toda escritura filtra por el usuario dueño**, así que manipular un formulario
  para tocar datos ajenos no lleva a ninguna parte.
- **Contraseñas cifradas de un solo sentido.** No se pueden recuperar.
- **Límite de intentos de login** guardado en base de datos, para que funcione
  también con varias instancias del servidor.
- **Cabeceras de seguridad HTTP** contra clickjacking y afines.
- **Sin SQL en crudo** ni HTML sin escapar.

Detalle completo, incluidos los riesgos aceptados: **[docs/seguridad.md](docs/seguridad.md)**.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm run lint` | Revisa el estilo |
| `npx tsc --noEmit` | Comprueba los tipos |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run crear-admin -- correo@x.com` | Crea un administrador |
| `npm run editar-usuario -- correo@x.com --password "…"` | Cambia datos de un usuario |

---

## Estructura

```
src/
├── app/          Cada carpeta es una URL
├── components/   Piezas de interfaz
├── lib/          Lógica: base de datos, auth, cálculos, Server Actions
└── proxy.ts      Se ejecuta antes de cada petición

prisma/
├── schema.prisma Definición de las tablas
├── migrations/   Historial de cambios (se sube a git)
└── dev.db        Tus datos (NO se sube)

docs/             Documentación completa
scripts/          Utilidades de terminal
```

---

## Avisos

- **`prisma/dev.db` contiene tus finanzas reales** y está excluido de git.
  Comprueba que sigue así antes de cada `push`.
- **El repositorio debería ser privado.**
- **No hay copias de seguridad automáticas.** Si borras algo, no hay papelera.
- **Los cobros automáticos se generan al abrir la aplicación**, no en segundo
  plano. Si pasas meses sin entrar, aparecerán todos de golpe con su fecha
  correcta.
- **Después de `prisma migrate dev` hay que reiniciar `npm run dev`.**

---

## Estado

Funcionalmente completo para uso personal. Lo que no tiene, por si algún día hace
falta: categorías de gasto, recuperación de contraseña por correo, exportación a
CSV, copias de seguridad automáticas y registro de auditoría.
