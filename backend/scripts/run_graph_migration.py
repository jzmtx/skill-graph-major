import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if "@123@" in db_url:
    db_url = db_url.replace("@123@", "%40123@")

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    with open("graph_ontology_migration.sql", "r") as f:
        sql = f.read()
    cursor.execute(sql)
    conn.commit()
    print("Migration executed successfully!")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error executing migration:", e)
