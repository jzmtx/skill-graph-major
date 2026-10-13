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


from supabase.client import ClientOptions

def _make_client() -> Client:
    options = ClientOptions(
        auto_refresh_token=False,
        persist_session=False,
        headers={"Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    client = create_client(SUPABASE_URL, SUPABASE_KEY, options)
    # Neutralize internal auth event listener so postgrest instance is never destroyed or mutated
    try:
        client._listen_to_auth_events = lambda *args, **kwargs: None
    except Exception:
        pass
    return client


def create_auth_client() -> Client:
    """Creates an isolated Supabase client for password authentication so the global client is never mutated or downgraded from service_role."""
    options = ClientOptions(
        auto_refresh_token=False,
        persist_session=False
    )
    return create_client(SUPABASE_URL, SUPABASE_KEY, options)


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
                temp_client = create_auth_client()
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
        builder = _client.table(name)
        expected_auth = f"Bearer {SUPABASE_KEY}"
        try:
            builder.headers["Authorization"] = expected_auth
            builder.headers["authorization"] = expected_auth
            _client.postgrest.headers["authorization"] = expected_auth
            _client.postgrest.headers["Authorization"] = expected_auth
            _client.options.headers["Authorization"] = expected_auth
        except Exception:
            pass
        return builder

    def rpc(self, *args, **kwargs):
        builder = _client.rpc(*args, **kwargs)
        expected_auth = f"Bearer {SUPABASE_KEY}"
        try:
            builder.headers["Authorization"] = expected_auth
            builder.headers["authorization"] = expected_auth
            _client.postgrest.headers["authorization"] = expected_auth
            _client.postgrest.headers["Authorization"] = expected_auth
            _client.options.headers["Authorization"] = expected_auth
        except Exception:
            pass
        return builder

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
