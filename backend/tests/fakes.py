"""A tiny in-memory stand-in for a pymongo collection.

It supports only what submissions.py uses (equality filters incl. dotted keys, $gte,
$set / $push / $setOnInsert, upsert, find_one_and_update). It exists so the workflow
rules can be tested without a database. It is NOT a substitute for testing against real
MongoDB; the API tests (test_api.py) use mongomock for broader coverage.
"""
import copy
import itertools

_ids = itertools.count(1)


def _get(doc, dotted):
    cur = doc
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _match(doc, flt):
    for key, cond in flt.items():
        value = _get(doc, key)
        if isinstance(cond, dict):
            for op, operand in cond.items():
                if op == "$gte":
                    if value is None or not value >= operand:
                        return False
                else:
                    raise NotImplementedError(op)
        elif value != cond:
            return False
    return True


class FakeCollection:
    def __init__(self):
        self.docs = []

    def insert_one(self, doc):
        doc.setdefault("_id", next(_ids))
        self.docs.append(copy.deepcopy(doc))

    def _find(self, flt):
        return next((d for d in self.docs if _match(d, flt)), None)

    def find_one(self, flt):
        d = self._find(flt)
        return copy.deepcopy(d) if d else None

    def count_documents(self, flt):
        return sum(1 for d in self.docs if _match(d, flt))

    def _apply(self, d, update, inserting=False):
        for k, v in update.get("$set", {}).items():
            d[k] = copy.deepcopy(v)
        for k, v in update.get("$push", {}).items():
            d.setdefault(k, []).append(copy.deepcopy(v))
        if inserting:
            for k, v in update.get("$setOnInsert", {}).items():
                d[k] = copy.deepcopy(v)

    def find_one_and_update(self, flt, update, return_document=False):
        d = self._find(flt)
        if d is None:
            return None
        self._apply(d, update)
        return copy.deepcopy(d)

    def update_one(self, flt, update, upsert=False):
        d = self._find(flt)
        if d is not None:
            self._apply(d, update)
            return
        if upsert:
            new = {k: v for k, v in flt.items() if not isinstance(v, dict)}
            self._apply(new, update, inserting=True)
            self.docs.append(new)
