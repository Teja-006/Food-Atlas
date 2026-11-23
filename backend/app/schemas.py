from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class RestaurantIn(BaseModel):
    """Only these fields can be set by clients (no mass assignment)."""

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
    image: HttpUrl | None = None
    rating: float = Field(0, ge=0, le=5)
