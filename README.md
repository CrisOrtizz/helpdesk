# Helpdesk El Constructor

Sistema de tickets IT interno para Almacén El Constructor.

**Stack:** FastAPI · SQLAlchemy 2.0 async · Alembic · PostgreSQL · Pydantic v2 · Docker

---

## Requisitos

- Docker Desktop (con Docker Compose v2)
- Git

## Arranque local

### 1. Levantar los servicios

```bash
docker compose up --build
```

Esto levanta tres servicios:
- **backend** → `http://localhost:8000` (FastAPI + Uvicorn con hot reload)
- **db** → PostgreSQL 16 en puerto `5432`
- **adminer** → `http://localhost:8080` (inspector visual de BD)

### 2. Correr las migraciones (primera vez)

```bash
docker compose exec backend alembic upgrade head
```

Esto crea las 7 tablas en PostgreSQL usando Alembic en modo async.

### 3. Verificar

```bash
# Health check de la API
curl http://localhost:8000/health

# Documentación interactiva
open http://localhost:8000/docs
```

### 4. Adminer (inspector visual de BD)

Abre `http://localhost:8080` con:
- **Sistema:** PostgreSQL
- **Servidor:** db
- **Usuario:** helpdesk
- **Contraseña:** helpdesk
- **Base de datos:** helpdesk_db

### 5. Generar nuevas migraciones (después de cambiar modelos)

```bash
docker compose exec backend alembic revision --autogenerate -m "descripcion del cambio"
docker compose exec backend alembic upgrade head
```

## Estructura del proyecto

```
helpdesk-el-constructor/
├── backend/
│   ├── app/
│   │   ├── core/         # config.py, database.py
│   │   ├── models/       # 7 entidades SQLAlchemy
│   │   ├── schemas/      # Pydantic schemas (Fase 2)
│   │   ├── api/v1/       # Routers FastAPI (Fase 2)
│   │   ├── crud/         # Lógica de acceso a datos (Fase 2)
│   │   └── tests/
│   ├── alembic/          # Migraciones de BD
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # React + TypeScript + Vite (Fase posterior)
├── docs/
└── docker-compose.yml
```

## Modelo de datos

7 entidades: `users`, `categories`, `tickets`, `comments`, `attachments`, `assets`, `audit_log`.

- **RBAC:** 3 roles → `admin`, `agente_soporte`, `solicitante`
- **Ticket:** dos FK a `users` (`solicitante_id`, `agente_id`)
- **Auth:** JWT access + refresh (Fase 2)

## Roadmap

- [x] Fase 1 — Arquitectura base: modelos, Alembic, Docker
- [ ] Fase 2 — Auth JWT + RBAC
- [ ] Fase 3 — CRUD de tickets + comentarios
- [ ] Fase 4 — Assets y audit log
- [ ] Fase 5 — Frontend React + TanStack Query
