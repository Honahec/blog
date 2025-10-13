---
title: JWT（JSON Web Token）教程
createTime: 2025/10/2 21:28:56
permalink: /blog/0r4vvjv1/
tags:
  - 后端
---

> JSON Web Token (JWT) is a compact URL-safe means of representing claims to be transferred between two parties.

## 背景：我们为什么需要 JWT？

先从认证（Authentication）/授权（Authorization）谈起，讲讲 JWT 解决了什么

### 传统的 Session + Cookie 模式

在传统 Web 应用架构（特别是服务端渲染 + 后端管理会话的模式）中，一个常见流程是：

:::steps

1. 用户提交用户名 + 密码给服务器；
2. 服务器验证成功后，在服务器端生成一个 Session（如存入内存、Redis、数据库等），并给客户端返回一个 session id；
3. 客户端浏览器以 Cookie 的方式保存 session id，并在后续每个请求里自动带上；
4. 服务器根据这个 session id 查到对应的用户信息，就知道这是哪个登录用户，从而进行权限判断、返回数据等。

:::

这种方式的问题或局限包括：

- **状态性（Stateful）**：服务器必须维护一个 session 存储。
- **扩展性问题**：如果你有多台后端服务器，session 必须共享。
- **适配性**：Cookie 在跨域、子域、移动端 API 调用里比较麻烦。
- **性能**：每次请求都要查 session 存储，造成 I/O 开销。

随着越来越多的应用架构向 **前后端分离**、**多域名服务** 等发展，传统 session 模式的缺点就越来越明显。

于是应运而生一种“无状态（stateless）”的认证方式 —— **Token 机制**，而 JWT 是目前被广泛采用的一种标准格式的 token。

### Token / JWT 的优点（为什么要用 JWT）

JWT 作为一种常见的 token 机制，带来了以下好处：

- **无状态 / 自包含（Stateless & Self-contained）**

  JWT 本身就包含必要的信息（如用户 ID、权限、过期时间等），服务器验证时只需校验签名即可，不必查数据库/会话存储（当然某些场景仍会查），减少了服务器的状态管理压力。

- **跨域 / 跨服务 / 多端一致性**

  因为 JWT 是标准字符串（通常通过 HTTP Header 带上），你可以很方便地在不同服务、不同子域、移动端使用。

- **灵活承载用户信息**

  在 token 的 payload 部分，你可以放一些附加声明（claims），如用户角色、权限、用户名、用户 ID 等。这样下游服务可以根据 token 里的信息快速做权限判断，无需额外查库。

- **性能提升**

  减少因为查 session、查数据库带来的 I/O 开销。

- **标准化 & 生态丰富**

  JWT 是一个开标准（RFC 7519），有很多成熟的库支持各种语言和中间件。

## JWT 是什么？

### 基本定义

JWT 即 **JSON Web Token**，是一个使用 JSON 表示声明（claims），并带有签名的令牌，用于在各方之间安全地传递信息。它可以用于认证、授权、信息交换（claim 传递）等场景。

其由三部分组成

```css
[ header ] . [ payload ] . [ signature ]
```

三部分都是经过 Base64Url 编码（而不是标准 Base64），然后用点 “.” 连接起来。

#### Header

Header 通常包含两个关键字段：

- **alg**：指定签名算法，例如 HS256（HMAC + SHA256）、RS256（RSA + SHA256）等
- **typ**：通常设置为 “JWT”

```json
{
  "typ": "JWT",
  "alg": "HS256"
}
```

然后 Base64Url 编码，就变成 header 部分。

#### payload

Payload 部分包含“声明（claims）”，即一些要传递的信息／断言。比如用户 ID、用户名、角色、token 颁发时间、过期时间等。

标准（注册）声明有一些保留字段，包括但不限于：

| Claim 名称 | 含义                               |
| ---------- | ---------------------------------- |
| iss        | 发行者（issuer）                   |
| sub        | 主题 / 面向的主体（通常是用户 ID） |
| aud        | 接收方（受众）                     |
| exp        | 过期时间（Expiration Time）        |
| nbf        | 在此时间之前不可用（Not Before）   |
| iat        | 颁发时间（Issued At）              |
| jti        | JWT 唯一标识 ID                    |

除此之外，还可以添加自定义的声明字段。但不要放太敏感的信息（如密码），因为 JWT 虽然签名了，但 payload 是可读的。

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

签名部分的作用是保证 **token 的完整性与真实性**。也就是说，接收方可以校验这个 token 是不是被篡改过、确实是由发行方签发的。

签名的计算方法通常如下（以 HS256 为例）：

```makefile
signature = HMAC_SHA256(
    base64UrlEncode(header) + "." + base64UrlEncode(payload),
    secret_key
)
```

对于使用 RSA / ECDSA 的算法，则是用私钥生成签名，公钥验证。这样签名者和验证者可以区分角色。

最终完整的 token 形式就是这样的字符串：

```
HEADER_BASE64.PAYLOAD_BASE64.SIGNATURE_BASE64
```

客户端接收到这个完整字符串后，在后续请求中带上，服务端就可以按同样方式验证签名，并确认 payload 是否被修改。

## JWT 的工作流程

下面用一个“前端 + 后端 API”的例子来说明 JWT 在实际中的流程。

### 典型流程

:::steps

1. 登录 / 认证 （Authentication）

   前端用户填写用户名 / 密码，提交给后端 login 接口。

   后端验证用户名 / 密码。如果认证成功，那么后端生成一个 JWT，包含用户 ID、角色、过期时间等信息。

   后端把这个 JWT 返回给前端。

2. 前端保存 token

   前端收到 JWT 后，一般存储在合适的位置（如 Http Only Cookie）

3. 请求受保护接口时带上 token

   前端在每次调用后端受保护 API 时，在 HTTP 请求头里添加 `Authorization: Bearer <token>`。

   后端收到请求，将 Authorization 头里的 token 取出来，做验证。

4. 服务端验证 token

   后端使用事先保存的 secret（对于 HMAC）或公钥（对于 RSA/ECDSA）对 token 的签名进行校验。

   如果签名不正确、token 过期、被篡改、不可用等，都拒绝访问。

   如果验证通过，解析 payload 得到用户身份信息（如用户 ID、角色等），然后可以继续做权限判断、返回数据等。

5. 刷新 / 续期

   通常 JWT 会带 `exp`（过期时间），过期后就不能再用。

   为了用户体验，通常还会设计一个 refresh token 的机制：短期有效的 access token + 长期有效的 refresh token。前端可以通过 refresh token 来获取新的 access token。

   这样可以缩短 access token 的有效期，降低被盗风险；同时又不强迫用户频繁登录。

6. 维护黑名单

   在用户登出时，为防止原本 token 继续被使用，通常会将原本的 token 拉入黑名单

:::

## 实际示例

以下为 Django REST framework 中使用 JWT 的示例

安装库

```bash
pip install djangorestframework-simplejwt
```

在鉴权 view 中导入相关方法

```python
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
```

用户登陆时生成 JWT Token

```python
refresh = RefreshToken.for_user(user)
return Response({
    'access': str(refresh.access_token),
    'refresh': str(refresh),
})
```

用户登出时维护黑名单

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
except TokenError as e: //验证 Token 有效
    return Response({'error': 'Invalid token'}, status=401)
```
