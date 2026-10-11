import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env from current directory or backend directory
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("SUPABASE_URL or SUPABASE_KEY is missing from environment variables.")


def _make_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def create_auth_client() -> Client:
    """Creates an isolated Supabase client for password authentication so the global client is never mutated or downgraded from service_role."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# Internal live client — updated by refresh_supabase()
_client: Client = _make_client()


def refresh_supabase() -> Client:
    """Creates a fresh Supabase client. Safe to call at any time."""
    global _client
    _client = _make_client()
    print("[SUPABASE] client refreshed")
    return _client


class _IsolatedAuthProxy:
    """Wraps auth to isolate sign_in operations so the singleton client is never tainted."""
    def __getattr__(self, name: str):
        attr = getattr(_client.auth, name)
        if name == "sign_in_with_password":
            def _isolated_sign_in(*args, **kwargs):
                temp_client = create_client(SUPABASE_URL, SUPABASE_KEY)
                return temp_client.auth.sign_in_with_password(*args, **kwargs)
            return _isolated_sign_in
        return attr


class _SupabaseProxy:
    """
    Proxy that always delegates to the current _client and guarantees
    that all database operations execute with the service_role key,
    completely preventing Row-Level Security (RLS) session downgrade bugs.
    """

    def table(self, name: str):
        # Guarantee PostgREST authorization header is always service_role
        try:
            expected_auth = f"Bearer {SUPABASE_KEY}"
            if _client.postgrest.session.headers.get("Authorization") != expected_auth:
                _client.postgrest.session.headers["Authorization"] = expected_auth
        except Exception:
            pass
        return _client.table(name)

    def rpc(self, *args, **kwargs):
        try:
            expected_auth = f"Bearer {SUPABASE_KEY}"
            if _client.postgrest.session.headers.get("Authorization") != expected_auth:
                _client.postgrest.session.headers["Authorization"] = expected_auth
        except Exception:
            pass
        return _client.rpc(*args, **kwargs)

    @property
    def auth(self):
        return _IsolatedAuthProxy()

    @property
    def storage(self):
        return _client.storage

    def __getattr__(self, name: str):
        return getattr(_client, name)


# All route files import this — it never changes, but always delegates to _client
supabase: _SupabaseProxy = _SupabaseProxy()
