"""Configuración de la aplicación a partir de variables de entorno."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Base de datos (Neon). Ej: postgresql+psycopg2://user:pass@host/db?sslmode=require
    database_url: str = "sqlite:///./local.db"

    # Resend
    resend_api_key: str = ""
    email_from: str = "Concursos GCBA <onboarding@resend.dev>"

    # Credenciales admin heredadas (se migran a la tabla usuarios como rol admin)
    admin_user: str = "admin"
    admin_pass: str = "cambiar-esta-clave"
    concursos_user: str = "concursos"
    concursos_pass: str = "cambiar-esta-clave"

    # Developer inicial (semilla). Se crea en la tabla usuarios al arrancar.
    developer_user: str = "developer"
    developer_pass: str = "cambiar-esta-clave-dev"

    # Secreto para firmar los tokens de sesión del panel.
    secret_key: str = "cambiar-este-secreto-en-produccion"

    # CORS: origen del frontend (Vercel). Coma-separado para varios.
    frontend_origin: str = "http://localhost:3001"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]


settings = Settings()
