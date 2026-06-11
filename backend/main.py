from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

from routers import auth
from routers import owner
from routers import salary
from routers import sales
from routers import shifts
from routers import shift_templates
from routers import users

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://shift-app-r7j1-og826jjuv-omochi05s-projects.vercel.app",
        "https://shift-app-r7j1-git-main-omochi05s-projects.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(owner.router)
app.include_router(salary.router)
app.include_router(sales.router)
app.include_router(shifts.router)
app.include_router(shift_templates.router)
app.include_router(users.router)


@app.get("/")
def read_root():
    return {"message": "Shift app API is running"}

@app.delete("/sales/{sale_id}")
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()

    if sale is None:
        raise HTTPException(status_code=404, detail="売上データが見つかりません")

    db.delete(sale)
    db.commit()

    return {"message": "売上を削除しました"}


@app.delete("/sales/{sale_id}/")
def delete_sale_with_slash(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()

    if sale is None:
        raise HTTPException(status_code=404, detail="売上データが見つかりません")

    db.delete(sale)
    db.commit()

    return {"message": "売上を削除しました"}