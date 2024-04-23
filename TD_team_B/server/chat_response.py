from enum import Enum
from typing import Optional
from pydantic import BaseModel

class ResponseType(Enum):
    START = "start"
    STREAM = "stream"
    ERROR = "error"
    END = "end"

class Sender(Enum):
    YOU = "you"
    BOT = "bot"

class ChatResponse(BaseModel):
    sender: Sender
    message: Optional[str] = None
    type: ResponseType