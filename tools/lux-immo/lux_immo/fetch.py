from __future__ import annotations

import time
import urllib.robotparser
from urllib.parse import urlparse

import requests

UA = "Mozilla/5.0 (compatible; LuxImmoHub/1.0; usage personnel)"
_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}


class Fetcher:
    def __init__(self, delay: float = 1.5, timeout: float = 25, respect_robots: bool = True):
        self.s = requests.Session()
        self.s.headers.update({"User-Agent": UA, "Accept-Language": "fr,en;q=0.8,de;q=0.6"})
        self.delay, self.timeout, self.respect_robots = delay, timeout, respect_robots
        self._last = 0.0

    def allowed(self, url: str) -> bool:
        if not self.respect_robots:
            return True
        host = "{0.scheme}://{0.netloc}".format(urlparse(url))
        if host not in _robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                r = self.s.get(host + "/robots.txt", timeout=self.timeout)
                rp.parse(r.text.splitlines() if r.ok else [])
                _robots[host] = rp
            except requests.RequestException:
                _robots[host] = None
        rp = _robots[host]
        return rp is None or rp.can_fetch(UA, url)

    def get(self, url: str) -> str:
        if not self.allowed(url):
            raise PermissionError(f"robots.txt interdit {url}")
        wait = self.delay - (time.time() - self._last)
        if wait > 0:
            time.sleep(wait)
        err: Exception | None = None
        for attempt in range(3):
            try:
                r = self.s.get(url, timeout=self.timeout)
                self._last = time.time()
                if r.status_code in (429, 503):
                    time.sleep(3 * (attempt + 1))
                    continue
                r.raise_for_status()
                return r.text
            except requests.RequestException as e:
                err = e
                time.sleep(1 + attempt)
        raise RuntimeError(f"échec {url}: {err}")
