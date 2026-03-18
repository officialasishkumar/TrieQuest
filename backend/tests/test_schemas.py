import pytest
from pydantic import ValidationError

from app.schemas import GroupCreateRequest, LoginRequest, ProblemCreateRequest, ProfileUpdateRequest, RegisterRequest


def test_register_request_accepts_frontend_camel_case_payload() -> None:
    payload = RegisterRequest.model_validate(
        {
            "email": "alex@example.com",
            "username": "Alex_User",
            "displayName": "Alex Rivera",
            "password": "TrieQuest!123",
            "favoriteTopic": "Graphs",
            "favoritePlatform": "LeetCode",
        }
    )

    assert payload.username == "alex_user"
    assert payload.display_name == "Alex Rivera"
    assert payload.favorite_topic == "Graphs"
    assert payload.favorite_platform == "LeetCode"


def test_group_and_profile_requests_accept_frontend_camel_case_payloads() -> None:
    group_payload = GroupCreateRequest.model_validate({"name": "Interview Sprint", "memberIds": [1, 2, 3]})
    profile_payload = ProfileUpdateRequest.model_validate(
        {
            "displayName": "Alex Rivera",
            "bio": "Updated bio",
            "favoriteTopic": "Dynamic Programming",
            "favoritePlatform": "Codeforces",
            "avatarUrl": "https://example.com/avatar.png",
        }
    )

    assert group_payload.member_ids == [1, 2, 3]
    assert profile_payload.display_name == "Alex Rivera"
    assert profile_payload.avatar_url == "https://example.com/avatar.png"


def test_login_request_accepts_identifier_or_email_payload() -> None:
    identifier_payload = LoginRequest.model_validate(
        {
            "identifier": " Alex_User ",
            "password": "TrieQuest!123",
        }
    )
    email_payload = LoginRequest.model_validate(
        {
            "email": "alex@example.com",
            "password": "TrieQuest!123",
        }
    )

    assert identifier_payload.identifier == "Alex_User"
    assert email_payload.identifier == "alex@example.com"


def test_register_request_accepts_any_non_empty_password() -> None:
    payload = RegisterRequest.model_validate(
        {
            "email": "alex@example.com",
            "username": "alex_user",
            "displayName": "Alex Rivera",
            "password": "short",
        }
    )
    assert payload.password == "short"


def test_profile_and_problem_urls_reject_unsafe_schemes() -> None:
    with pytest.raises(ValidationError, match="HTTPS"):
        ProfileUpdateRequest.model_validate(
            {
                "displayName": "Alex Rivera",
                "bio": "Updated bio",
                "avatarUrl": "http://example.com/avatar.png",
            }
        )

    with pytest.raises(ValidationError, match="HTTPS"):
        ProblemCreateRequest.model_validate(
            {
                "url": "http://leetcode.com/problems/two-sum/",
            }
        )
