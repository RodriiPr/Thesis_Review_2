Desarrollo local (más rápido):
Solo los servicios de infraestructura necesitan Docker. La API y Web pueden correr en tu máquina directamente:
# 1. Levanta solo servicios (postgres, redis, minio)
docker compose up postgres redis minio -d

# 2. Inicializa la base de datos (migración + seed)
docker compose up seed

# 3. Instala dependencias (si no lo hiciste)
pnpm install

# 4. Arranca todo en modo dev (Turborepo corre API + Web en paralelo)
pnpm dev
Ventajas:
- Hot reload inmediato (sin rebuild de Docker image)
- Compilación mucho más rápida
- Puedes debuggear con tu IDE directamente
- Los containers de infra se quedan corriendo de fondo