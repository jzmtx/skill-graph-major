import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

migration_file = os.path.join(os.path.dirname(__file__), "migrations", "company_module_migration.sql")

def run_migration():
    if not DATABASE_URL:
        print("No DATABASE_URL found in .env")
        return
        
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        with open(migration_file, 'r') as f:
            sql = f.read()
            
        print("Executing migration...")
        cur.execute(sql)
        conn.commit()
        print("Migration executed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    run_migration()
