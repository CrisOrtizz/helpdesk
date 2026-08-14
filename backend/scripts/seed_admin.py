#!/usr/bin/env python3
"""
Crea el usuario administrador inicial.
Uso dentro del contenedor:
    docker compose exec backend python scripts/seed_admin.py
"""
import asyncio
import sys
from pathlib import Path

# Asegurar que /app (raíz del proyecto) esté en el path de Python
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        admin = User(
            nombre="Administrador",
            email="admin@helpdesk.com",
            password_hash=hash_password("admin1234"),
            rol=UserRole.admin,
        )
        session.add(admin)
        await session.commit()
        await session.refresh(admin)

    await engine.dispose()
    print(f"✓ Admin creado → email: admin@helpdesk.com  password: admin1234  id: {admin.id}")


if __name__ == "__main__":
    asyncio.run(main())
