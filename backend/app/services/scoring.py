from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from typing import Protocol, Sequence


TOKEN_PATTERN = re.compile(r"[a-z0-9+#.]+")
SKILL_ALIASES = {
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "react.js": "react",
    "reactjs": "react",
    "fast api": "fastapi",
    "node.js": "node",
    "nodejs": "node",
    "js": "javascript",
    "ts": "typescript",
    "ml": "machine learning",
}


class JobLike(Protocol):
    title: str
    description: str
    location: str
    remote_policy: str
    required_skills: Sequence[str]
    preferred_skills: Sequence[str]
    min_experience_years: float


class CandidateLike(Protocol):
    headline: str
    summary: str
    location: str
    skills: Sequence[str]
    experience_years: float


class EmbeddingProvider(Protocol):
    """Production hook for a real embedding model used by scoring and Milvus."""

    backend_name: str
    dimensions: int

    def embed(self, text: str) -> list[float]: ...


def normalize_skill(value: str) -> str:
    normalized = " ".join(value.strip().lower().split())
    return SKILL_ALIASES.get(normalized, normalized)


def tokenize(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text.lower())


def deterministic_embedding(text: str, dimensions: int = 96) -> list[float]:
    """Create a stable feature-hash vector (a fallback, not a semantic model)."""

    vector = [0.0] * dimensions
    tokens = tokenize(text)
    if not tokens:
        return vector

    features = tokens + [f"{left}_{right}" for left, right in zip(tokens, tokens[1:])]
    for feature in features:
        digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=16).digest()
        index = int.from_bytes(digest[:8], "big") % dimensions
        sign = 1.0 if digest[8] & 1 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    return [value / norm for value in vector] if norm else vector


class FeatureHashEmbeddingProvider:
    backend_name = "local-feature-hash"

    def __init__(self, dimensions: int = 96) -> None:
        self.dimensions = dimensions

    def embed(self, text: str) -> list[float]:
        return deterministic_embedding(text, self.dimensions)


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    cosine = sum(a * b for a, b in zip(left, right)) / (left_norm * right_norm)
    return max(0.0, min(1.0, cosine))


def candidate_text(candidate: CandidateLike) -> str:
    return " ".join(
        [candidate.headline, candidate.summary, candidate.location, *candidate.skills]
    )


def job_text(job: JobLike) -> str:
    return " ".join(
        [job.title, job.description, job.location, *job.required_skills, *job.preferred_skills]
    )


@dataclass(frozen=True)
class ScoreResult:
    total: float
    breakdown: dict[str, float | dict[str, float]]
    reasons: list[str]
    evidence: dict[str, object]
    version: str = "deterministic-v1"


class CandidateScorer:
    WEIGHTS = {"semantic": 0.25, "skills": 0.40, "experience": 0.25, "location": 0.10}

    def __init__(
        self, dimensions: int = 96, embedding_provider: EmbeddingProvider | None = None
    ) -> None:
        self.embedding_provider = embedding_provider or FeatureHashEmbeddingProvider(dimensions)

    def score(self, candidate: CandidateLike, job: JobLike) -> ScoreResult:
        candidate_skills = {normalize_skill(skill) for skill in candidate.skills}
        required = {normalize_skill(skill) for skill in job.required_skills}
        preferred = {normalize_skill(skill) for skill in job.preferred_skills}
        matched_required = sorted(candidate_skills & required)
        matched_preferred = sorted(candidate_skills & preferred)

        if required:
            required_ratio = len(matched_required) / len(required)
            preferred_bonus = min(0.15, 0.05 * len(matched_preferred))
            skills = min(1.0, required_ratio + preferred_bonus)
        else:
            skills = 1.0

        minimum = max(0.0, job.min_experience_years)
        experience = 1.0 if minimum == 0 else min(1.0, candidate.experience_years / minimum)
        location = self._location_score(candidate.location, job.location, job.remote_policy)
        semantic = cosine_similarity(
            self.embedding_provider.embed(candidate_text(candidate)),
            self.embedding_provider.embed(job_text(job)),
        )

        components = {
            "semantic": semantic,
            "skills": skills,
            "experience": experience,
            "location": location,
        }
        total = 100 * sum(components[key] * self.WEIGHTS[key] for key in self.WEIGHTS)

        reasons: list[str] = []
        if matched_required:
            reasons.append(f"Matches {len(matched_required)}/{len(required)} required skills: " + ", ".join(matched_required))
        if matched_preferred:
            reasons.append("Also has preferred skills: " + ", ".join(matched_preferred))
        if experience >= 1:
            reasons.append(
                f"Meets the {minimum:g}+ years experience requirement ({candidate.experience_years:g} years)"
            )
        elif minimum:
            reasons.append(
                f"Has {candidate.experience_years:g} of {minimum:g} requested years of experience"
            )
        if location >= 1:
            reasons.append("Location or remote preference aligns with the role")
        if semantic >= 0.35:
            reasons.append("Profile summary is semantically aligned with the role")

        breakdown: dict[str, float | dict[str, float]] = {
            key: round(value * 100, 1) for key, value in components.items()
        }
        breakdown["weights"] = self.WEIGHTS.copy()
        evidence: dict[str, object] = {
            "matched_required_skills": matched_required,
            "missing_required_skills": sorted(required - candidate_skills),
            "matched_preferred_skills": matched_preferred,
            "candidate_experience_years": candidate.experience_years,
            "required_experience_years": minimum,
            "candidate_location": candidate.location,
            "job_location": job.location,
            "remote_policy": job.remote_policy,
        }
        return ScoreResult(
            total=round(total, 1),
            breakdown=breakdown,
            reasons=reasons[:4],
            evidence=evidence,
        )

    @staticmethod
    def _location_score(candidate_location: str, job_location: str, remote_policy: str) -> float:
        policy = remote_policy.strip().lower()
        if policy in {"remote", "remote_first", "anywhere"}:
            return 1.0
        candidate_tokens = set(tokenize(candidate_location))
        job_tokens = set(tokenize(job_location))
        if not candidate_tokens or not job_tokens:
            return 0.5 if policy == "hybrid" else 0.0
        if candidate_tokens == job_tokens or candidate_tokens.issubset(job_tokens) or job_tokens.issubset(candidate_tokens):
            return 1.0
        overlap = len(candidate_tokens & job_tokens) / len(candidate_tokens | job_tokens)
        if overlap:
            return min(1.0, 0.4 + overlap)
        return 0.25 if policy == "hybrid" else 0.0
