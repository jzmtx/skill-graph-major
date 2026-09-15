import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("SUPABASE_URL or SUPABASE_KEY is missing from environment variables.")


def _make_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# Internal live client — updated by refresh_supabase()
_client: Client = _make_client()


def refresh_supabase() -> Client:
    """Creates a fresh Supabase client. Safe to call at any time."""
    global _client
    _client = _make_client()
    print("🔄 Supabase client refreshed")
    return _client


class _SupabaseProxy:
    """
    Proxy that always delegates to the current _client.

    Because all route files do `from database import supabase`, they hold a
    reference to THIS proxy object — which never changes. Only _client changes
    when refresh_supabase() is called, so all routes automatically use the
    fresh connection without needing a restart.
    """

    def table(self, name: str):
        return _client.table(name)

    def rpc(self, *args, **kwargs):
        return _client.rpc(*args, **kwargs)

    @property
    def auth(self):
        return _client.auth

    @property
    def storage(self):
        return _client.storage

    def __getattr__(self, name: str):
        # Fallback for any other attributes
        return getattr(_client, name)


# All route files import this — it never changes, but always delegates to _client
supabase: _SupabaseProxy = _SupabaseProxy()
