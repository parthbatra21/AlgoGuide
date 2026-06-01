from pydantic import BaseModel, EmailStr, field_validator


class User(BaseModel):
    id: str | None = None
    name: str
    email: EmailStr
    age: int | None = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    age: int | None = None


class QuestionAnswer(BaseModel):
    question_id: str
    question_text: str
    answer: str


class UserAnswers(BaseModel):
    email: EmailStr
    answers: list[QuestionAnswer]

    @field_validator("answers")
    @classmethod
    def answers_must_not_be_empty(cls, value: list[QuestionAnswer]) -> list[QuestionAnswer]:
        if not value:
            raise ValueError("At least one answer is required.")
        return value


class AIMentorRequest(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def question_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Question cannot be empty.")
        return value.strip()
