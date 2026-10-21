from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass, field


@dataclass
class Listing:
    source: str
    url: str
    title: str = ""
    price: int | None = None
    surface: float | None = None
    bedrooms: int | None = None
    location: str = ""
    property_type: str = ""
    image: str = ""
    transaction: str = "sale"
    extra: dict = field(default_factory=dict)

    @property
    def uid(self) -> str:
        return hashlib.sha1(f"{self.source}|{self.url.split('?')[0]}".encode()).hexdigest()[:16]

    def to_dict(self) -> dict:
        d = asdict(self)
        d["uid"] = self.uid
        return d
