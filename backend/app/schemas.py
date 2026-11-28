import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")  # keeps \t \n \r
_PHONE = re.compile(r"[0-9+()\-\s.]*")
_PHONE10 = re.compile(r"\d{10}")
_USERNAME = re.compile(r"[a-zA-Z0-9_]{3,30}")

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

class ProfileIn(BaseModel):
    """Only these fields can be set by the signed-in user themself."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field("", max_length=80)
    username: str = Field("", max_length=30)
    phone: str = Field("", max_length=10)
    dob: str = Field("", max_length=10)  # yyyy-mm-dd, or empty
    gender: Literal["Male", "Female", "Non-binary", "Prefer not to say"] = "Prefer not to say"
    city: str = Field("", max_length=80)
    area: str = Field("", max_length=80)
    photo_url: HttpUrl | None = None  # a link to an image; there is no file upload yet
    notify_near_me: bool = True
    notify_weekly: bool = False

    @field_validator("name", "city", "area")
    @classmethod
    def _no_control_chars(cls, v: str) -> str:
        if _CONTROL_CHARS.search(v):
            raise ValueError("contains invalid characters")
        return v

    @field_validator("username")
    @classmethod
    def _username_shape(cls, v: str) -> str:
        if v and not _USERNAME.fullmatch(v):
            raise ValueError("username must be 3-30 characters: letters, numbers, underscore only")
        return v

    @field_validator("phone")
    @classmethod
    def _phone_shape(cls, v: str) -> str:
        if v and not _PHONE10.fullmatch(v):
            raise ValueError("phone number must be exactly 10 digits")
        return v

    @field_validator("dob")
    @classmethod
    def _dob_shape(cls, v: str) -> str:
        if v and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            raise ValueError("date of birth must be in yyyy-mm-dd format")
        return v
