import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")  # keeps \t \n \r
_PHONE = re.compile(r"[0-9+()\-\s.]*")


class SubmissionIn(BaseModel):
    """Only these fields can be set by a user (no mass assignment). Anything else in the
    request (rating, status, owner, ...) is ignored. In particular there is no `rating`:
    a new place starts unrated so submitters cannot boost their own listing."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    description: str = Field("", max_length=1000)
    cuisine: str = Field(min_length=1, max_length=120)
    category: str = Field("Other", max_length=60)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    address: str = Field("", max_length=250)
    phone: str = Field("", max_length=30)
    hours: str = Field("", max_length=60)
    price_range: Literal["₹", "₹₹", "₹₹₹", "₹₹₹₹"] | None = None
    image: HttpUrl | None = None  # http(s) only

    @field_validator("name", "description", "cuisine", "category", "address", "phone", "hours")
    @classmethod
    def _no_control_chars(cls, v: str) -> str:
        if _CONTROL_CHARS.search(v):
            raise ValueError("contains invalid characters")
        return v

    @field_validator("phone")
    @classmethod
    def _phone_shape(cls, v: str) -> str:
        if not _PHONE.fullmatch(v):
            raise ValueError("phone may only contain digits, spaces and + - ( ) .")
        return v


class RejectIn(BaseModel):
    """The reason is shown to the person who submitted the place, so keep it polite."""

    model_config = ConfigDict(str_strip_whitespace=True)
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def _no_control_chars(cls, v: str) -> str:
        if _CONTROL_CHARS.search(v):
            raise ValueError("contains invalid characters")
        return v
