from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from hints import generate_hint
from misconceptions import MisconceptionName, diagnose
from problems import Problem, compute_columns, generate_problem

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CheckRequest(BaseModel):
    minuend: int
    subtrahend: int
    submitted_answer: int


class CheckResponse(BaseModel):
    correct: bool
    misconception: MisconceptionName | None
    hint: str | None


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
    if correct:
        return CheckResponse(correct=True, misconception=None, hint=None)

    misconception = diagnose(problem, request.submitted_answer)
    hint = generate_hint(problem, misconception) if misconception else None
    return CheckResponse(correct=False, misconception=misconception, hint=hint)
