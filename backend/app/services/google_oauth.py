from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.config import get_settings

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@dataclass(frozen=True)
class GoogleUser:
    google_id: str
    email: str
    name: str
    picture: str | None


async def exchange_code_for_user(code: str) -> GoogleUser:
    """Exchange an authorization code for Google user info."""
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        raise ValueError("Google OAuth is not configured.")

    async with httpx.AsyncClient(timeout=15) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_response.raise_for_status()
        tokens = token_response.json()

        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        userinfo_response.raise_for_status()
        info = userinfo_response.json()

    return GoogleUser(
        google_id=info["id"],
        email=info["email"],
        name=info.get("name", info["email"].split("@")[0]),
        picture=info.get("picture"),
    )
