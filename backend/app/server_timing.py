# server_timing.py
import time
import contextvars
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Globalni "kontekst" za metrike po-requestu
_request_metrics = contextvars.ContextVar("request_metrics", default=None)

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        metrics = {"db_ms": 0.0, "db_queries": 0}
        token = _request_metrics.set(metrics)
        t0 = time.perf_counter()

        try:
            # pusti zahtjev kroz stack; ako baci izuzetak, ne diramo response
            response = await call_next(request)
        except Exception:
            # uvijek očisti contextvar pa prepusti grešku dalje
            _request_metrics.reset(token)
            raise
        else:
            total_ms = (time.perf_counter() - t0) * 1000.0
            st = (
                f"total;dur={total_ms:.1f}, "
                f"db;dur={metrics['db_ms']:.1f}, "
                f'q;desc="db queries";dur={metrics["db_queries"]}'
            )
            # dodaj header samo kada response postoji
            response.headers["Server-Timing"] = st
            response.headers["Timing-Allow-Origin"] = "*"
            _request_metrics.reset(token)
            return response


# --- SQLAlchemy event hook-ovi za mjerenje DB vremena ---

# PRILAGODI ovaj import svom projektu (gdje kreiraš engine)
from app.database import engine  # npr. "from app.database import engine"

from sqlalchemy import event

@event.listens_for(engine, "before_cursor_execute")
def _before_cursor_execute(conn, cursor, statement, params, context, executemany):
    conn.info.setdefault("query_start_time", []).append(time.perf_counter())

@event.listens_for(engine, "after_cursor_execute")
def _after_cursor_execute(conn, cursor, statement, params, context, executemany):
    start = conn.info["query_start_time"].pop(-1)
    dur_ms = (time.perf_counter() - start) * 1000.0
    metrics = _request_metrics.get()
    if metrics is not None:
        metrics["db_ms"] += dur_ms
        metrics["db_queries"] += 1
        # Opcionalno: logiraj spore upite (npr. > 50 ms)
        if dur_ms > 50:
            # zamijeni svojim loggerom ako želiš
            print(f"[SLOW SQL] {dur_ms:.1f} ms :: {statement[:120]} ...")
