from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, shifts, salary, sales, owner

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(shifts.router)
app.include_router(salary.router)
app.include_router(sales.router)
app.include_router(owner.router)


@app.get("/")
def root():
    return {"message": "Shift app API is running"}