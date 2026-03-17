---
title: Very Detailed! In-depth Understanding of OAuth Principles and Implementation Details
createTime: 2025/10/13 15:57:53
permalink: /en/blog/u4qtuft8/
tags:
  - Repost
copyright:
  creation: reprint
  author: FreewheelLee​
  source: https://zhuanlan.zhihu.com/p/380561372
  license: Unknown
---

I've read some OAuth-related articles on Zhihu and other platforms, most of which provide a full introduction to OAuth and its basic flow. I always feel they're a bit too shallow - readers only know what it is but not why it is.

If you've read OAuth-related articles but are still confused about the following questions:

1. Does OAuth solve Authentication or Authorization problems?

2. Why does the browser URL sometimes need to point to the web app I'm using, and sometimes to the authorization provider (like GitHub or Google)? (Or you haven't noticed the URL domain changing at all)

3. Why does the URL in the OAuth flow need so many parameters? What's the design intent behind each parameter? Can they be omitted?

4. What's the purpose of the Authorization code? Can't we just pass back the Access Token directly?

5. What's the format of Authorization code and Access Token? Are there requirements?

Then please read this article patiently, and remember to like, favorite, and bookmark it!

## Why Do We Need OAuth? What's the Purpose of OAuth?

![](https://pic3.zhimg.com/v2-536f915ff6604e6f040ef8c270774dda_1440w.jpg)

What counts as secure? Two parts:

1. How do you prove you are you? Authentication - identity verification.

2. How can we trust you have permission to do something? Authorization.

### Authentication

Taking GitHub's authentication as an example, their [documentation](https://docs.github.com/zh/authentication/keeping-your-account-and-data-secure/about-authentication-to-github) describes it this way:

> To keep your account secure, you must authenticate before you can access certain resources on GitHub. When you authenticate to GitHub, you supply or confirm credentials that are unique to you to prove that you are exactly who you declare to be.
> You can access your resources in GitHub in a variety of ways: in the browser, via GitHub Desktop or another desktop application, with the API, or via the command line. Each way of accessing GitHub supports different modes of authentication.
>
> 1. Username and password with two-factor authentication
> 2. Personal access token
> 3. SSH key

Simply put, **authentication is providing unique (usually also confidential) credentials to prove you are you!**

### Authorization

> Authorization is the process of giving someone the ability to access a resource.

Authorization is the process of granting someone the ability to access a resource.

Authorization usually also has the concept of scope - how to access resources, which parts/to what extent of the resources can be accessed.

Here's a real-life example: you own a house, and you can authorize others to enter your house - for instance, inviting your friends to visit, then they can enter your house; but if a thief enters the house, that's [illegal trespassing](https://baike.baidu.com/item/%E9%9D%9E%E6%B3%95%E4%BE%B5%E5%85%A5%E4%BD%8F%E5%AE%85%E7%BD%AA)! You can let a cleaning lady enter the house to clean, but she can only clean the house and can't renovate it!

## What Does OAuth Mainly Do?

After understanding Authentication and Authorization, let's briefly understand what OAuth mainly does.

Before that, let's familiarize ourselves with the **participants** in the entire OAuth flow (first key knowledge point):

1. Resource Owner - the resource owner, who is also the user of the Application

2. Application - the web app the user is preparing to use (of course it can also be a mobile app or other applications, but this article only focuses on web apps)

3. Authorization Server - the authorization server where all permission information and security information are managed

4. Resource Server - the resource server that stores resources, materials, and content

After understanding these 4 concepts, the OAuth flow can be simply summarized as:

**The Resource Owner, when using a third-party Application, grants the third-party Application permission to access certain resources on the Resource Server through the Authorization Server.**

Let's look at a typical OAuth scenario together - logging into [codepen.io](https://codepen.io/) using a GitHub account.

In this example, [codepen.io](https://codepen.io/) wants to obtain authorization for two permissions. The first is Gists-related permissions, so that code can be written to the user's Gist on codepen and code can be read from Gist; the second permission is Email, used as account information after login.

@[artPlayer](https://image.honahec.cc/Codepen%20OAuth%20GitHub%20-%20%E7%9F%A5%E4%B9%8E.mp4)

In the video, I didn't enter a username and password the entire time because I had already logged into GitHub beforehand, but this doesn't affect this being a complete OAuth process - because in this example, the core of OAuth is **the user granting codepen permission to access Gists and Email under GitHub's interface.**

![](https://pica.zhimg.com/v2-58498feca1cd28c3c34af209fde31690_1440w.jpg)

In other words, how the user logs into their GitHub account is not an important part of this process.

Some readers might ask, isn't "logging in with a GitHub account" also a type of login? Isn't login identity verification? Isn't that Authentication? - In fact, at this point codepen hasn't verified your identity; all it did was obtain your GitHub username and email from GitHub (through an access token), then correspondingly create a new (or use an existing) account.

In this example, the Application obtains permission to access resources through the OAuth flow. In this regard, Gists permission and email permission are exactly the same. **As for how to use the resources, it completely depends on the Application** - for example, in codepen, email is used for account registration while Gists are used for reading/writing code.

Therefore, OAuth solves Authorization problems and doesn't concern itself with Authentication.

(If you still have questions, I recommend reading this article [OAuth is Not Authentication](https://www.scottbrady.io/oauth/oauth-is-not-authentication))

(In fact, an Authentication solution based on OAuth flow is called OpenId Connect, which can indeed be used to solve Authentication problems, but it adds many additional concepts and operations.)
## OAuth Implementation Details (Very Detailed!)

The Codepen example is a bit complex, so let's switch to a simpler and more straightforward example.

Suppose User A is using a note-taking Web App (let's call it Best-Notes, purely fictional, if there's any similarity, please send money). **Best-Notes** provides a feature that allows users to import notes from GitHub Gist. We can refer to Codepen's implementation and use OAuth to help the note-taking Web App implement this feature.

**Why not let users enter their GitHub account password in the note-taking Web App (best-notes)?**

1. If we let users tell **Best-Notes** their GitHub username and password, **Best-Notes** would gain access to all information and permissions of our GitHub account — it could not only read our gists but also **delete our git repositories**;

2. Additionally, if **Best-Notes** stores our GitHub account password in its database, once it's hacked by attackers, it means our GitHub account is also compromised.

Therefore, what we pursue is **limited permissions** — only allowing **Best-Notes** to have permission to read our gists, without directly using our GitHub account password.

When using OAuth to solve this problem:

Resource Owner is the GitHub user (i.e., the owner of GitHub Gists), who is also the user currently using this note-taking Web App;

Application is this note-taking web app (**Best-Notes**) — which can actually be divided into two parts:

(1). Best-Notes frontend, assuming the URL is

![](https://pic2.zhimg.com/v2-9f7e3fa9ed3445c3f39b2c888f2cf4c9_1440w.png)

(2). Best-Notes backend (server), assuming the backend address is

![](https://pica.zhimg.com/v2-04112a77c14e1f1068901a2e293926bc_1440w.png)

Authorization Server is GitHub's authorization server, with the address

![](https://pic3.zhimg.com/v2-96a1d9df095bdee747f879b49aa7368e_1440w.png)

Resource Server is the server that stores our Gists, with the address

![](https://pic4.zhimg.com/v2-906158104779a1416f00ced22d63c8eb_1440w.png)

The diagram below is a rough illustration of the entire process

![](https://pic1.zhimg.com/v2-8cd30e0e99119168d009cf6621864aa6_1440w.jpg)

### Preparation — Registering Best-Notes on GitHub Authorization Server

Preparation — Registering Best-Notes on GitHub Authorization Server

This step is very important. Only after registering the Application can the subsequent process proceed normally, and many parameter values come from the values at registration time.

GitHub OAuth App registration address: https://github.com/settings/developers

The interface after successful registration looks like this

![](https://pic1.zhimg.com/v2-83d3781e89aefb3b43878be0f9bfaa76_1440w.jpg)

![](https://pic2.zhimg.com/v2-f015f86bf4c43ff93e07cea0c9595b3f_1440w.jpg)

It's okay if you don't understand the content now, we'll explain it soon.

### Process Analysis

Next, let's analyze this process step by step in detail:

:::steps

1.  The user visits the note-taking web app **Best-Notes**, i.e.

    ![](https://pica.zhimg.com/v2-c01aa5c1da76cfdc794c426250e77764_1440w.png)

2.  The user wants to use **Best-Notes**' feature to import gists, so they click a button on the website

    ![Button that triggers OAuth authorization](https://pic3.zhimg.com/v2-aa23af88c35173f1feef1d7aa96bdad0_1440w.jpg)

3.  At this point, **Best-Notes** will redirect the browser to a new URL.

    **This is the first very important URL in OAuth**, its format looks something like this:

    ![](https://pica.zhimg.com/v2-7defd62134059a33ea5c725f57d3751c_1440w.png)

    The user will see an authorization page on the GitHub website. **Note that this URL is under the GitHub domain**, meaning the subsequent interaction is between the user and GitHub, and has nothing to do with **Best-Notes**' frontend or backend.

    ![](https://pic2.zhimg.com/v2-607afb0df1e51166726815c6fccf739f_1440w.jpg)

    This page describes a lot of information in detail:

    1) The name and icon of the Application being authorized

    2) The permissions about to be granted

    3) The redirect address after successful authorization

    All this information is closely related to the parameters in the URL.

    Let's look at the parameters in the URL together:

    1) `client_id` — This parameter helps the GitHub Authorization Server identify the third-party application (in this article, it's the note-taking web app **Best-Notes**) — The Authorization Server will confirm in the database whether this client_id is legitimate; based on the information pre-registered with this client_id, it displays the Application's name, icon, description, and other information to the user.

    2) `redirect_uri` — After the user successfully authorizes, they will be redirected to this address. In the above example, it's

    ![](https://pica.zhimg.com/v2-078f40ebb31d30d094d07690afd0efec_1440w.png)

    Note! This redirect_uri also needs to be provided when registering the Application. **The Authorization Server will confirm in the database whether the current redirect_uri matches the client_id** — Why? If it doesn't check, a hacker could use the same client_id and change the redirect_uri to a malicious website's URL. The user thinks they're authorizing **best-notes**, but gets redirected to a malicious website, allowing the malicious website to obtain the authorization code (this concept will be explained later)!

    3) `scope` — This parameter specifies the scope of permissions we hope the user will grant. For example, GitHub provides these scopes ([Scopes for OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes)) such as: repo, gist, notifications, user, workflow, etc.

    In our example, we used gist as the scope;

    Scope usually supports multiple values;

    The permissions corresponding to the scope are all displayed on the authorization page, letting users clearly know what permissions they're about to grant to **Best-Notes**.

    4) `state` — This is usually an optional parameter, and its value is typically a random value; after the user completes authorization, **this parameter will be appended unchanged to the redirect address**. (We'll continue to explain the purpose of this parameter later)

4.  After authorization is complete, the browser will be redirected **by GitHub** to a new URL. **This is the second very important URL.**

    In the **Best-Notes** example, this URL probably looks like this

    ![](https://pic3.zhimg.com/v2-09e2d809e496ec70b971a61cab20b060_1440w.png)

    > [!WARNING]
    >
    > - This **redirect is initiated by the GitHub Authorization Server** (the parameter values in the URL are also generated by the GitHub Authorization Server)
    >
    > - The first half of this URL
    >
    > ![](https://picx.zhimg.com/v2-efb9fa1eb1d62d04db1f657a75a69b3f_1440w.png)
    >
    > is the value of redirect_uri in the first URL
    >
    > - The value of the state parameter is also the same as the state parameter value in the first URL
    >
    > - The code parameter is a very important concept in OAuth — Authorization code. Later, this Authorization code will be used to obtain the final Access token
    > - **Key point: This URL is actually a GET request to the Application backend API**, not an HTML page! In other words, when the browser accesses this URL, the Application backend doesn't return an HTML page. Instead, the Application backend sends a request to the GitHub Authorization Server based on the parameters in the URL (code and state) to obtain the Access Token. After success, it tells the browser to redirect again to the Application's frontend URL, i.e.
    >
    > ![](https://picx.zhimg.com/v2-dfddffe989ce51315a3e888f648c8b19_1440w.png)

    — This process is usually very fast, so **users almost never notice that the browser's URL actually changed twice!** (Readers can watch the Codepen video again)

    ![](https://pica.zhimg.com/v2-d82c3082541382fa977c94dff4aa2fa0_1440w.jpg)

    (In the above image

    ![](https://picx.zhimg.com/v2-b77e89c1d8278b11e425ef3db8107f9d_1440w.png)

    returns status [302](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/302) (i.e., redirect) and location points to

    ![](https://pic4.zhimg.com/v2-681a2a2a1931f76a254ecbfa426ce5c5_1440w.jpg)

    )

    For the user, this step is very fast, and the entire OAuth process is complete. But **for the Application backend, the workload in this step is actually quite substantial**. Let's carefully look at all the details that happen in between.

    When the browser accesses

    ![](https://picx.zhimg.com/v2-9c443dffe24f9e02ba7cd0f821898309_1440w.png)

    the Application backend obtains the Authorization code generated by GitHub and the random string state generated by the Application in step 3.

    The purpose of the random string state: Used to **defend against CSRF attacks** — This state should be implemented as a random string. In a normal OAuth flow, the state obtained in this step must be the same as the state generated when initiating OAuth; if a hacker launches a CSRF attack, i.e., forges a

    ![](https://pic3.zhimg.com/v2-9bbea17fdd41e03dbb673c1dfe6dbb54_1440w.png)

    the Application backend finds that this state doesn't match and can determine this is a fake request and immediately reject it.

5.  After passing the state verification, the Application backend generates another URL based on the Authorization code. This is **the third very important URL**, with a format similar to the following

    ![](https://pic3.zhimg.com/v2-47b40479ae843c2b8a3028131a2de6a4_1440w.png)

    The Application backend sends a request to this URL to obtain the final Access Token.

    Parsing the parameters of this URL:

    - `code` — This is the value of the Authorization code

    - `client_id` — Same as before, this client_id helps the GitHub Authorization Server identify the third-party application (in this article, it's **Best-Notes**)

    - `client_secret` — This is a password. When registering the Application, GitHub generates this string, **used by the GitHub Authorization Server to verify the identity of the Application backend** — What does this mean? Remember in step three, when the user jumped to the GitHub authorization page, the client_id was actually exposed in the browser's address bar, so anyone (including hackers) could see this client_id. Therefore, using only client_id for verification is not secure. — In short, client_id and client_secret are used in this step to prove to the GitHub Authorization Server that this request really comes from the Application (backend)

    - `redirect_uri` — This value must be the same as before, otherwise it will also be rejected by the GitHub Authorization Server. Personally, I think the significance of this parameter here is relatively small. After all, the identity of the Application can already be verified based on client_id and client_secret. According to the [official documentation](https://www.oauth.com/oauth2-servers/redirect-uris/redirect-uri-validation/#granting-access-tokens), this parameter is just to add an extra layer of security protection.

6.  After the Application backend sends a request to this URL, it can successfully obtain the Access Token. GitHub's Access Token looks something like this:

    > gho_GWabcxD0gXu1OtVAX678xm2EShpxbx0RY123

7.  Finally, the Application backend can use this Access Token to send requests to the GitHub Resource Server, such as

    ![](https://picx.zhimg.com/v2-364605e1a24a9e4746e632858e9700d9_1440w.jpg)

    to retrieve the user's Gists.

:::
## Finally Answering the Initial Questions

1. Does OAuth solve Authentication or Authorization problems?

Answer: Already answered above.

2. Why does the browser URL sometimes need to point to the web app I'm using, and sometimes to the authorization provider (e.g., GitHub or Google)? (Or perhaps you haven't noticed the URL domain changing at all)

Answer: The authorization page must be on the authorization provider's site, such as GitHub (i.e., step 3 in the previous text), to ensure that the user themselves is authorizing rather than the Application authorizing on their behalf — imagine a hacker wrote a malicious website that deliberately triggers the OAuth flow and opens the GitHub authorization page. Since the GitHub authorization page is under the GitHub domain, JavaScript on the malicious website cannot operate across domains.

3. Why do URLs in the OAuth flow need so many parameters? What is the design intent behind each parameter? Can they be omitted?

Answer: Explained in the detailed flow above.

4. What is the purpose of the Authorization code? Why not pass back the Access Token directly?

Answer: For better security. In the second important URL, the authorization code is actually exposed in the browser's history, but since the Application backend needs to use this code to make another request to obtain the Access Token, seeing the authorization code does not constitute a security issue. Conversely, if the authorization code in the second important URL were replaced with an Access Token, it could be stolen and used directly.

5. What is the format of the Authorization code and Access Token? Are there requirements?

Answer: OAuth does not restrict the format of the Authorization code and Access Token. In GitHub's OAuth implementation, both are random strings; in other implementations, they might be JWTs.

## Summary

What is learned on paper is superficial; to truly understand, one must practice!

I hope that after reading this article, readers can practice the OAuth flow themselves. GitHub's OAuth registration and development experience are both excellent, and interested students can give it a try. For those with network restrictions, you can also try OAuth with Weibo or WeChat.

## References

[What is Authorization? - Examples and definition - Auth0](https://auth0.com/intro-to-iam/what-is-authorization)

[Authorization vs Authentication - OAuth 2.0 Simplified](https://www.oauth.com/oauth2-servers/openid-connect/authorization-vs-authentication/)

[OAuth is Not Authentication](https://www.scottbrady.io/oauth/oauth-is-not-authentication)

[OpenID Connect Basic Client Implementer's Guide 1.0 - draft 40](https://openid.net/specs/openid-connect-basic-1_0.html)

[Redirect URL Validation - OAuth 2.0 Simplified](https://www.oauth.com/oauth2-servers/redirect-uris/redirect-uri-validation/)

[Resources in the REST API](https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?apiVersion=2022-11-28)

[Authorizing OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

[302 Found - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/302)

[Prevent Attacks and Redirect Users with OAuth 2.0 State Parameters](https://auth0.com/docs/secure/attack-protection/state-parameters)