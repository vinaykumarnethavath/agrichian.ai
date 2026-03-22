import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

# Handle asyncpg URL for psycopg2
if "postgresql+asyncpg://" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

def wipe_database():
    print(f"🧹 Wiping demo data from database (psycopg2)...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        # In reverse order of dependencies
        tables_to_clear = [
            "traceabilityevent", "customercartitem", "customerorderitem", 
            "customerorder", "manufacturersale", "productionbatch", 
            "manufacturerpurchase", "shoporderitem", "shoporder", 
            "cropharvest", "cropexpense", "crop", "product", 
            "landrecord", "farmerprofile", "shopprofile", "manufacturer", "user"
        ]
        
        for table in tables_to_clear:
            try:
                # Check if table exists before truncating to avoid errors on partial schemas
                cur.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table}')")
                if cur.fetchone()[0]:
                    print(f"  Truncating {table}...")
                    cur.execute(f"TRUNCATE TABLE \"{table}\" RESTART IDENTITY CASCADE")
                else:
                    print(f"  ⏭️ Table {table} does not exist, skipping.")
            except Exception as te:
                print(f"  ⚠️ Could not truncate {table}: {te}")
                # Don't rollback since we are in autocommit, just continue
        
        cur.close()
        conn.close()
        print("✅ Database wiped successfully!")
    except Exception as e:
        print(f"❌ Error connecting/wiping: {e}")

if __name__ == "__main__":
    wipe_database()
