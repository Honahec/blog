---
title: What is Single Sign-On (SSO)? What are the common implementation methods?
createTime: 2025/10/13 10:22:34
permalink: /en/blog/7xyzj9rf/
tags:
  - Repost
copyright:
  creation: reprint
  author: Full Stack Security
  source: https://zhuanlan.zhihu.com/p/1924948480390062830
  license: Unknown
---

> Introduction:
>
> Every day at work you need to log into OA, CRM, financial systems... too many passwords to remember? Accidentally set them all to "123456" and worried about getting hacked? Don't panic! Single Sign-On (SSO) is the "master key" that can save you, but if used improperly it could become a hacker's "golden ticket". Today we'll break down the mysteries of SSO and its security risks in plain language with diagrams!

## 1. What is Single Sign-On?

Single Sign-On (SSO) is an authentication scheme that allows users to access multiple applications or websites using one set of credentials (for example, username and password). This means users only need to log in once to access all authorized systems without having to log in separately for each system.

Here's a simple example: after logging into your Baidu account (baidu.com/), when you visit the following sites you'll be logged in without needing to log in again:

Baidu Netdisk: pan.baidu.com/

Baidu Library: wenku.baidu.com/

Wenxin Yiyan: yiyan.baidu.com/

Baidu Translate: fanyi.baidu.com/

The core goal of single sign-on is to improve user experience and simplify the login process.

## 2. Why Use SSO?

- **Improve User Experience**: Users only need to remember one set of login credentials to access multiple systems, making operations more convenient.

- **Enhance Security and Management Efficiency**: Reduce the number of passwords, lower the risk of leakage, and centralize account management to simplify operations. Without SSO, when employees join a company, accounts need to be registered for each application, and similarly, when employees leave, administrators must disable their accounts in each application. With SSO, you can directly delete their account in the IdP (Identity Provider).

- **Easy System Integration**: Enable sharing of identity information across applications, improving collaboration and integration capabilities between systems.

## 3. SSO Technical Implementation Principles

There are many ways to implement SSO. If applications share the same primary domain (in the Baidu example above, the primary domain is all baidu), after a user successfully logs in, you can set a Cookie that works for all subdomains, allowing automatic login across all subdomain applications (wenku, yige).

![Baidu web sites sharing cookies](https://pic3.zhimg.com/v2-8c4f3f27b3cc2a5ed4e6b7a284d578d2_1440w.jpg)

However, to implement cross-domain single sign-on, you cannot use the simple shared Cookie solution. Classic cross-domain single sign-on methods include:

- **CAS**: Central Authentication Service
- **OAuth2**: Open Authorization
- **OIDC**: OpenID Connect
- **SAML**: Security Assertion Markup Language

Before introducing these four implementation methods, you need to understand the following three **core concepts**:

- **Identity Provider (IdP)**: The system responsible for verifying user identity. When a user attempts to access an application, that application redirects the user to the IdP for authentication.

- **Service Provider (SP)**: The application or website the user is trying to access. The SP relies on the IdP to verify the user's identity.

- **Trust Relationship**: A trust relationship must be established between the SP and IdP so that the SP can trust the authentication results provided by the IdP.

### 3.1. CAS

CAS is a widely used SSO system, originally developed by Yale University between 2000-2002, primarily to provide a standardized single sign-on solution for web applications.

![CAS originated at Yale University (2000-2002)](https://pic2.zhimg.com/v2-5295f27743b99e8e95f639b65b7b1b9b_1440w.jpg)

In 2004, Yale University open-sourced the code under the supervision of Jasig (later Apereo).

![Apereo CAS open source project](https://picx.zhimg.com/v2-b8e44a9a38aa2d814dbc6ecd641b285f_1440w.jpg)

When a user (web browser) accesses a CAS client (web application), the CAS client redirects the user's browser to the CAS server, where the user performs authentication (such as username and password authentication). After successful authentication, the CAS server redirects the user back to the CAS client (carrying a Service Ticket parameter). The CAS client sends the Service Ticket and its own service identifier to request user information from the CAS server.

The CAS single sign-on flow is shown in the following diagram:

![CAS single sign-on flow](https://pic1.zhimg.com/v2-628461f933a8e2ab8150ef31b2967f80_1440w.jpg)

Detailed flow description:

:::steps

1. The CAS client protects the web application's protected resources as a Filter, filtering every request from the client. The CAS client analyzes whether the HTTP request contains an authentication Ticket. If not, it means the user has not been authenticated;

2. The CAS client redirects the user request to the CAS server, submitting a Service parameter (such as helloservice) to specify the target address for redirection after successful authentication (i.e., the CAS client application address), such as https://casserver/login?service=https%3A%2F%2Fhelloservice;

3. User authentication process: If the user provides correct credentials, the server generates a random authentication Ticket (Service Ticket) and caches this Ticket;

4. The server redirects the user to the CAS client with the newly generated authentication Ticket and its own service identifier;

5. The CAS client sends the user's Ticket to the server to confirm identity;

6. The CAS server confirms user authentication through the Ticket and returns user information (such as username).

:::

**Important points:**

- Tickets can only be used once;

- Tickets should have a short validity period (10s~300s);

- Tickets are created using secure random numbers to prevent guessing;

- The CAS server must filter the URL in the service parameter to avoid redirecting to malicious websites. (This is also explicitly emphasized in the official Apereo CAS documentation)

### 3.2. OAuth2.0

OAuth is a commonly used **authorization framework** that enables websites and web applications to request limited access to a user's account on another application. OAuth allows users to grant this access without exposing their login credentials to the requesting application. This means users can adjust what data they want to share without handing over complete control of their account to third parties.

Both OAuth 2.0 and OAuth 1.0 are authorization frameworks used to allow third-party applications to access user resources, but they have significant differences in implementation details and design philosophy. **OAuth 1.0 has been largely abandoned due to security issues and is rarely used anymore.**

![When logging into Zhihu via QQ, users are prompted to grant Zhihu relevant permissions](https://picx.zhimg.com/v2-7e636ff446a8724f3586ab2fb655e0d3_1440w.jpg)

One of the core steps in OAuth 2.0 is having the application obtain an Access Token from the authorization center. Since OAuth 2.0 has a complex design, this article won't go into detail. Interested readers can follow me - I'll explain OAuth 2.0's working mechanism and security analysis in plain language with practical examples in future posts.

### 3.3. OIDC

OAuth 2.0 itself is primarily used for authorization (allowing third-party applications to access your resources, but not directly proving who you are). OIDC (OpenID Connect) adds identity authentication functionality (explicitly identifying user identity) on top of OAuth 2.0, so **OIDC has both identity authentication and authorization capabilities, making it a more standard way to implement single sign-on.**

OIDC is a mature, open standard (managed by the OpenID Foundation) that is widely adopted and supported. Various languages, frameworks, cloud services, and IdPs have mature libraries and implementations.

![OIDC protocol suite](https://picx.zhimg.com/v2-ab663e68b6edf4f019ff8c40f893a2b9_1440w.jpg)

> The working mechanism of the OIDC protocol will be detailed in future blog posts. Here, just remember that OIDC is not an independent protocol, but an identity authentication layer built on top of the widely used OAuth 2.0 authorization framework.

By cleverly extending OAuth 2.0, OIDC provides a powerful, secure, and modern standard specifically for implementing identity authentication and single sign-on. Its JSON/JWT-based design, good security model, broad industry support, and adaptability to various application types make it the preferred protocol for building modern web, mobile, and enterprise application SSO solutions.

Whether for social media login (such as Facebook, Twitter) or building a unified identity authentication platform within an enterprise, OIDC is the core supporting technology.

### 3.4. SAML

SAML is an XML-based data standard used to exchange authentication and authorization information. In single sign-on scenarios, SAML is primarily used to exchange information between Identity Providers (IdP) and Service Providers (SP).

![SAML workflow (typical SSO scenario)](https://picx.zhimg.com/v2-0e5151eff10cc653a7afc6a0a9cd6073_1440w.jpg)

SAML is the **cornerstone protocol** for enterprise-level single sign-on, achieving secure identity federation through standardized XML assertions and trust chains. Although gradually replaced by OIDC in the mobile internet era, it remains an irreplaceable solution in traditional enterprise integration, government, education, and other fields. Understanding its core flow (SP → IdP → SP) and key components (assertions, metadata, signatures) is an important part of mastering enterprise identity governance.

:::table

| Feature | SAML | OIDC |
| ---------- | -------------------------------- | --------------------------------- |
| Protocol Foundation | XML/SOAP | JSON/REST (based on OAuth 2.0) |
| Token Format | XML Assertions | JWT (ID Token) |
| Main Scenarios | Enterprise SSO (B2B, internal system integration) | Modern applications, mobile, consumer identity authentication |
| Transmission Efficiency | Large message size (XML redundancy) | Lightweight (JSON concise) |
| Mobile Support | Weak (relies on browser redirection) | Native support (suitable for app-embedded browsers) |
| Flexibility | Complex configuration (requires handling XML signatures/encryption) | Convenient development (standard JWT libraries widely supported) |
| Delegated Authorization | Not supported (authentication only) | Supported (can be combined with OAuth 2.0 to access APIs) |

> Selection Recommendations:
>
> Need to integrate with traditional enterprise systems (such as Microsoft ADFS, Shibboleth) → SAML
>
> Building new applications/mobile/internet services → OIDC

:::