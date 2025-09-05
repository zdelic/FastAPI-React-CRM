from pydantic import BaseModel
from typing import List

class ProjectUserAdd(BaseModel):
    user_id: int

class ProjectUsersReplace(BaseModel):
    user_ids: List[int]
