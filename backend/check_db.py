from sqlmodel import create_engine, text
engine = create_engine('postgresql://agri:agri_pass@localhost:5432/agri_db')
with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='crop'"))
    cols = [r[0] for r in result]
    print("Crop cols:", cols)
