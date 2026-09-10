from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import get_summary, init_db, log_attempt
from hints import generate_hint
from misconceptions import MisconceptionName, diagnose
from problems import Problem, compute_columns, generate_problem

load_dotenv()
init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CheckRequest(BaseModel):
    session_id: str
    minuend: int
    subtrahend: int
    submitted_answer: int


class CheckResponse(BaseModel):
    correct: bool
    misconception: MisconceptionName | None
    hint: str | None


class MisconceptionCount(BaseModel):
    name: str
    count: int


class SessionSummary(BaseModel):
    total_attempts: int
    correct_count: int
    misconceptions: list[MisconceptionCount]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/problem")
def get_problem() -> Problem:
    return generate_problem()


@app.post("/check")
def check_answer(request: CheckRequest) -> CheckResponse:
    problem = Problem(
        minuend=request.minuend,
        subtrahend=request.subtrahend,
        answer=request.minuend - request.subtrahend,
        columns=compute_columns(request.minuend, request.subtrahend),
    )
    correct = request.submitted_answer == problem.answer
    misconception = None if correct else diagnose(problem, request.submitted_answer)
    hint = generate_hint(problem, misconception) if misconception else None

    log_attempt(
        session_id=request.session_id,
        minuend=request.minuend,
        subtrahend=request.subtrahend,
        submitted_answer=request.submitted_answer,
        correct=correct,
        misconception=misconception,
    )

    return CheckResponse(correct=correct, misconception=misconception, hint=hint)


@app.get("/summary/{session_id}")
def get_session_summary(session_id: str) -> SessionSummary:
    total_attempts, correct_count, misconception_counts = get_summary(session_id)
    return SessionSummary(
        total_attempts=total_attempts,
        correct_count=correct_count,
        misconceptions=[
            MisconceptionCount(name=name, count=count)
            for name, count in misconception_counts.items()
        ],
    )
