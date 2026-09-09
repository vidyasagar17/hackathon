from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from problems import Problem, generate_problem

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/problem")
def get_problem() -> Problem:
    return generate_problem()
