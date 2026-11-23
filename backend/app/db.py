from pymongo import ASCENDING, DESCENDING, GEOSPHERE, MongoClient

from .config import get_settings

_settings = get_settings()
client = MongoClient(_settings.mongo_uri, tz_aware=True, serverSelectionTimeoutMS=8000)
db = client[_settings.mongo_db]

restaurants = db["restaurants"]
users = db["users"]


def ensure_indexes() -> None:
    users.create_index("firebase_uid", unique=True)
    restaurants.create_index([("location", GEOSPHERE)])
    restaurants.create_index([("category", ASCENDING)])
    restaurants.create_index([("rating", DESCENDING)])
