---
title: JWT (JSON Web Token) Tutorial
createTime: 2025/10/2 21:28:56
permalink: /en/blog/0r4vvjv1/
tags:
  - Backend
---

> JSON Web Token (JWT) is a compact URL-safe means of representing claims to be transferred between two parties.

## Background: Why Do We Need JWT?

Let's start with Authentication/Authorization and discuss what problems JWT solves

### Traditional Session + Cookie Model

In traditional web application architectures (especially server-side rendering + backend session management models), a common flow is:

:::steps

1. User submits username + password to the server;
2. After successful verification, the server generates a Session on the server side (stored in memory, Redis, database, etc.) and returns a session id to the client;
3. The client browser saves the session id as a Cookie and automatically includes it in subsequent requests;
4. The server looks up the corresponding user information based on this session id, identifies which logged-in user it is, and then performs permission checks, returns data, etc.

:::

Problems or limitations of this approach include:

- **Stateful**: The server must maintain a session storage.
- **Scalability issues**: If you have multiple backend servers, sessions must be shared.
- **Compatibility**: Cookies are problematic with cross-domain, subdomain, and mobile API calls.
- **Performance**: Each request requires querying the session storage, causing I/O overhead.

As more and more application architectures move toward **frontend-backend separation**, **multi-domain services**, etc., the drawbacks of the traditional session model become increasingly apparent.

This gave rise to a "stateless" authentication method — **Token mechanism**, and JWT is a currently widely adopted standard format token.

### Advantages of Token / JWT (Why Use JWT)

JWT, as a common token mechanism, brings the following benefits:

- **Stateless & Self-contained**

  JWT itself contains the necessary information (such as user ID, permissions, expiration time, etc.). When verifying, the server only needs to validate the signature without querying the database/session storage (though some scenarios still require queries), reducing the server's state management burden.

- **Cross-domain / Cross-service / Multi-platform Consistency**

  Because JWT is a standard string (usually passed via HTTP Header), you can conveniently use it across different services, different subdomains, and mobile platforms.

- **Flexible User Information Carrying**

  In the payload section of the token, you can include additional claims, such as user roles, permissions, username, user ID, etc. This allows downstream services to quickly make permission decisions based on the information in the token without additional database queries.

- **Performance Improvement**

  Reduces I/O overhead from querying sessions and databases.

- **Standardization & Rich Ecosystem**

  JWT is an open standard (RFC 7519) with many mature libraries supporting various languages and middleware.
## What is JWT?

### Basic Definition

JWT, or **JSON Web Token**, is a token that uses JSON to represent claims and includes a signature, used for securely transmitting information between parties. It can be used for authentication, authorization, information exchange (claim transmission), and other scenarios.

It consists of three parts:

```css
[ header ] . [ payload ] . [ signature ]
```

All three parts are encoded using Base64Url (not standard Base64) and then connected with dots ".".

#### Header

The Header typically contains two key fields:

- **alg**: Specifies the signature algorithm, such as HS256 (HMAC + SHA256), RS256 (RSA + SHA256), etc.
- **typ**: Usually set to "JWT"

```json
{
  "typ": "JWT",
  "alg": "HS256"
}
```

After Base64Url encoding, it becomes the header part.

#### payload

The Payload part contains "claims", which are information/assertions to be transmitted. For example, user ID, username, role, token issuance time, expiration time, etc.

Standard (registered) claims have some reserved fields, including but not limited to:

| Claim Name | Meaning                                           |
| ---------- | ------------------------------------------------- |
| iss        | Issuer                                            |
| sub        | Subject / target subject (usually user ID)        |
| aud        | Audience (recipient)                              |
| exp        | Expiration Time                                   |
| nbf        | Not Before (not usable before this time)          |
| iat        | Issued At                                         |
| jti        | JWT unique identifier ID                          |

In addition, you can add custom claim fields. However, don't include overly sensitive information (such as passwords), because although JWT is signed, the payload is readable.

```json
{
  "sub": "114514",
  "name": "Joker",
  "role": "joker",
  "iat": 1630000000,
  "exp": 1630003600
}
```

#### Signature

The purpose of the signature part is to ensure the **integrity and authenticity of the token**. In other words, the recipient can verify whether the token has been tampered with and that it was indeed issued by the issuer.

The signature calculation method is typically as follows (using HS256 as an example):

```makefile
signature = HMAC_SHA256(
    base64UrlEncode(header) + "." + base64UrlEncode(payload),
    secret_key
)
```

For algorithms using RSA / ECDSA, a private key is used to generate the signature, and a public key is used for verification. This way, the signer and verifier can have distinct roles.

The final complete token format is a string like this:

```
HEADER_BASE64.PAYLOAD_BASE64.SIGNATURE_BASE64
```

After the client receives this complete string, it includes it in subsequent requests, and the server can verify the signature in the same way and confirm whether the payload has been modified.
## JWT Workflow

Below is an example using "Frontend + Backend API" to illustrate how JWT works in practice.

### Typical Workflow

:::steps

1. Login / Authentication

   The frontend user fills in username/password and submits to the backend login endpoint.

   The backend verifies the username/password. If authentication succeeds, the backend generates a JWT containing user ID, role, expiration time, and other information.

   The backend returns this JWT to the frontend.

2. Frontend saves token

   After receiving the JWT, the frontend typically stores it in an appropriate location (such as Http Only Cookie)

3. Include token when requesting protected endpoints

   When calling backend protected APIs, the frontend adds `Authorization: Bearer <token>` in the HTTP request header.

   The backend receives the request and extracts the token from the Authorization header for verification.

4. Server validates token

   The backend uses the pre-saved secret (for HMAC) or public key (for RSA/ECDSA) to verify the token's signature.

   If the signature is incorrect, token is expired, tampered with, or unavailable, access is denied.

   If verification passes, parse the payload to get user identity information (such as user ID, role, etc.), then proceed with permission checks, return data, etc.

5. Refresh / Renewal

   Typically JWT includes `exp` (expiration time), and cannot be used after expiration.

   For better user experience, a refresh token mechanism is usually designed: short-lived access token + long-lived refresh token. The frontend can use the refresh token to obtain a new access token.

   This shortens the access token's validity period, reducing theft risk; while not forcing users to log in frequently.

6. Maintain blacklist

   When users log out, to prevent the original token from continuing to be used, the original token is typically added to a blacklist

:::

## Practical Example

Below is an example of using JWT in Django REST framework

Install library

```bash
pip install djangorestframework-simplejwt
```

Import related methods in authentication view

```python
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
```

Generate JWT Token when user logs in

```python
refresh = RefreshToken.for_user(user)
return Response({
    'access': str(refresh.access_token),
    'refresh': str(refresh),
})
```

Maintain blacklist when user logs out

```python
refresh_token = request.data.get("refresh")
if refresh_token:
    token = RefreshToken(refresh_token)
    token.blacklist()
```

Refresh token

```python
try:
    refresh = RefreshToken(refresh_token)
    access_token = refresh.access_token
    return Response({
        'access': str(access_token),
        'refresh': str(refresh),
    })
except TokenError as e: //Verify Token validity
    return Response({'error': 'Invalid token'}, status=401)
```