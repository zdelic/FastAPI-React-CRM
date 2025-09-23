# tune_sqlite.py
import sqlite3, os, sys, time
from pathlib import Path

DB = "test.db"  # ➜ promijeni ako se tvoja datoteka zove drukčije (npr. app.db)

db_path = Path(__file__).with_name(DB)
if not db_path.exists():
    print(f"[ERROR] DB file not found: {db_path}")
    sys.exit(1)

print(f"[INFO] Using DB: {db_path}")

# provjera da li je DB zaključana
try:
    # ekskluzivni open test: pokušaj rename kao brzu provjeru locka
    # (Windows neće dati rename otvorene datoteke; preskačemo ako baci Exception)
    tmp = db_path.with_suffix(".lockcheck")
    db_path.rename(tmp)
    tmp.rename(db_path)
except Exception:
    print("[WARN] DB may be open/locked by another process. Stop your backend before running this.")
    # ne prekidamo; sqlite će ionako prijaviti ako je truly locked

con = sqlite3.connect(str(db_path))
cur = con.cursor()

def execmany(sql_list):
    for sql in sql_list:
        cur.execute(sql)

indexes = [
  "CREATE INDEX IF NOT EXISTS idx_tasks_project               ON tasks(project_id)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_project_start_end     ON tasks(project_id, start_soll, end_soll)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_top                   ON tasks(top_id)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_procstep              ON tasks(process_step_id)",
  "CREATE INDEX IF NOT EXISTS idx_tops_ebene                  ON tops(ebene_id)",
  "CREATE INDEX IF NOT EXISTS idx_ebenen_stiege               ON ebenen(stiege_id)",
  "CREATE INDEX IF NOT EXISTS idx_stiegen_bauteil             ON stiegen(bauteil_id)",
  "CREATE INDEX IF NOT EXISTS idx_bauteile_project            ON bauteile(project_id)",
  "CREATE INDEX IF NOT EXISTS idx_procsteps_model             ON process_steps(model_id)",
  "CREATE INDEX IF NOT EXISTS idx_procsteps_gewerk            ON process_steps(gewerk_id)",
]

print("[INFO] Creating indexes (idempotent)...")
t0 = time.time()
execmany(indexes)
con.commit()
print(f"[OK] Indexes ensured in {time.time()-t0:.2f}s")

print("[INFO] Applying PRAGMA tuning...")
cur.execute("PRAGMA journal_mode = WAL;")
cur.execute("PRAGMA synchronous  = NORMAL;")
cur.execute("PRAGMA temp_store   = MEMORY;")
cur.execute("PRAGMA cache_size   = -200000;")   # ~200MB cache
print(f"[OK] journal_mode = {cur.execute('PRAGMA journal_mode;').fetchone()[0]}")

print("[INFO] ANALYZE & VACUUM...")
cur.execute("ANALYZE;")
con.commit()
cur.execute("VACUUM;")
con.close()
print("[DONE] SQLite tuning done.")

