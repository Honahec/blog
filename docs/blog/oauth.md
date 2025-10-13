---
title: 非常详细！深入理解OAuth原理和实践细节
createTime: 2025/10/13 15:57:53
permalink: /blog/u4qtuft8/
tags:
  - 转载
copyright:
  creation: reprint
  author: FreewheelLee​
  source: https://zhuanlan.zhihu.com/p/380561372
  license: 未知
---

在知乎或者其他平台已经看过一些 OAuth 相关的文章，大多都是全文介绍 OAuth 和基本流程。总觉得太浅了一些，读者看完只知其然不知其所以然。

如果你看过 OAuth 的相关文章，但是对以下问题仍有困惑：

1. OAuth 解决的是 Authentication 还是 Authorization 问题？

2. 为什么浏览器的 URL 有时候需要指向我正在用的 web app，有时候指向的是授权方（比如，GitHub 或 Google）？（亦或者你完全没发现 URL 的 domain 曾经变化过）

3. OAuth 流程中的 URL 为什么需要那么多参数？每个参数背后的设计意图是什么？可以省略吗？

4. Authorization code 的作用是什么？直接传回 Access Token 不行吗？

5. Authorization code 和 Access Token 的格式是什么，有要求吗？

那么请耐心读完本文，最后记得点赞、喜欢、收藏！

## 为什么需要 OAuth？OAuth 的目的是什么？

![](https://pic3.zhimg.com/v2-536f915ff6604e6f040ef8c270774dda_1440w.jpg)

怎么才算是安全？两部分：

1. 怎么证明你是你？ Authentication 即 身份验证、认证。

2. 怎么相信你有权限做什么事情？ Authorization 即 授权。

### Authentication 身份验证、认证

以 Github 的身份验证为例，它们的[文档](https://docs.github.com/zh/authentication/keeping-your-account-and-data-secure/about-authentication-to-github)是这么描述的

> 为确保帐户安全，必须先进行身份验证，然后才能访问 GitHub 上的某些资源。 向 GitHub 验证时，您提供或确认您唯一的凭据，以证明您就是声明者。
> 您可以通过多种方式访问 GitHub 中的资源：浏览器中、通过 GitHub Desktop 或其他桌面应用程序、使用 API 或通过命令行。 每种访问 GitHub 的方式都支持不同的身份验证模式。
>
> 1. 使用双重身份验证的用户名和密码
> 2. 个人访问令牌
> 3. SSH 密钥

简单而言，**认证就是就是提供唯一的（通常也是保密的）凭据来证明你就是你！**

### Authorization 授权

> Authorization is the process of giving someone the ability to access a resource.

授权是授予某人访问资源的能力的过程。

而授权通常还有范围（scope）的概念，即怎么访问资源，访问资源的哪些部分/哪个程度。

举个生活中的例子，你拥有一套房子，你可以授权别人进入你的房子 —— 比如邀请你的朋友来家里作客，那么他们就能进入你的房子；但是如果小偷进入房子，那就是[非法侵入住宅](https://baike.baidu.com/item/%E9%9D%9E%E6%B3%95%E4%BE%B5%E5%85%A5%E4%BD%8F%E5%AE%85%E7%BD%AA) ！你可以请保洁阿姨进房子打扫，但是她们只能打扫房屋不能把你的房子给装修了！

## OAuth 主要在做什么？

了解了 Authentication 和 Authorization 后，再简单了解一下 OAuth 主要在做什么。

在这之前，先熟悉一下整个 OAuth 流程中的**参与者**（第一个重点知识）

1. Resource Owner —— 资源拥有者，同时也是 Application 的用户

2. Application —— 用户正在准备使用的 web app （当然也可以是手机 APP 或其他应用，本文只关注 web app）

3. Authorization Server —— 授权服务器，所有的权限信息、安全信息都在这个服务器上管理

4. Resource Server —— 资源服务器，存储资源、材料、内容的服务器

理解这 4 者的概念后，OAuth 流程可以简单概况为：

**资源拥有者（Resource Owner）在使用第三方应用（Application）时，通过授权服务器（Authorization Server）授予第三方应用（Application）在资源服务器（Resource Server）访问某些资源的权限。**

我们一起看一个典型的 OAuth 场景——使用 GitHub 账号登录 [codepen.io](https://codepen.io/)

在这个例子中，[codepen.io](https://codepen.io/) 希望获得授权得到两个权限，第一个是 Gists 相关权限，这样在 codepen 上就把代码写入用户的 Gist 中，也能从 Gist 中读取代码；第二个权限是 Email，作为登录后的账号信息。

@[artPlayer](https://image.honahec.cc/Codepen%20OAuth%20GitHub%20-%20%E7%9F%A5%E4%B9%8E.mp4)

视频中，我全程没有输入用户名和密码，因为我已经提前登录了 GitHub ，但这并不影响这是一个完整的 OAuth 过程 —— 因为在这个例子中，OAuth 的核心就是**用户在 GitHub 的界面下授予 codepen 访问 Gists 和 Email 的权限。**

![](https://pica.zhimg.com/v2-58498feca1cd28c3c34af209fde31690_1440w.jpg)

换句话说在这个过程中，用户如何登录 GitHub 账户并不是重要的一环。

有的读者可能会问了，“使用 GitHub 账号登录”不也是一种登录吗？登录不就是验证身份吗？不就是 Authentication 吗？ —— 事实上，此时 codepen 并没有验证你的身份，它做的仅仅是（通过 access token）从 GitHub 那里获取到了你的 GitHub 账户名和 email，然后对应地新建一个（或使用已有的）账号。

在这个例子中，Application 通过 OAuth 流程拿到权限去获取资源，在这一点上 Gists 权限和 email 权限 的完全相同的，**至于怎么使用资源，就完全取决于 Application** —— 比如，在 codepen 中，email 用于注册账号而 Gists 则用于读/写代码。

因此，OAuth 解决是 Authorization 问题，并不关心 Authentication。

(如果还有疑问，推荐阅读这篇文章 [OAuth is Not Authentication](https://www.scottbrady.io/oauth/oauth-is-not-authentication))

(事实上，一个基于 OAuth 流程的 Authentication 方案叫作 OpenId Connect ，的确可以用于解决 Authentication 问题，但是它新增了很多额外的概念和操作。)

## OAuth 的实践细节（非常细！）

Codepen 的例子稍微有点复杂，让我们换一个更简单更直接的例子。

假设 小 A 正在使用一个笔记 Web App（假设叫 Best-Notes，纯属虚构，如有雷同，请打钱），**Best-Notes** 提供了一个功能，可以让用户从 GitHub Gist 中导入笔记。我们可以参考 codepen 的实现，使用 OAuth 帮助笔记 Web App 实现这个功能。

**为什么不让用户在笔记 Web App(best-notes)中输入 GitHub 账号密码？**

1. 如果让用户把 GitHub 的用户名密码告诉 **Best-Notes**，**Best-Notes** 就会获得我们的 GitHub 账户的一切信息和权限 —— 它既可以读取我们的 gist，还可以**删除我们的 git 仓库**；

2. 此外，如果 **Best-Notes** 在它的数据库中存放了我们的 GitHub 账户密码，一旦它被黑客侵入也就意味着我们的 GitHub 账号也被泄漏。

因此，我们追求的是**有限的权限** —— 只让 **Best-Notes** 有权读取我们的 gist，且无需直接使用我们的 GitHub 账户密码。

使用 OAuth 解决这个问题时：

Resource Owner 就是 GitHub 用户（即 GitHub Gists 的拥有者），同时也是正在使用这个笔记 Web App 的用户；

Application 就是这个笔记 web app （**Best-Notes**）—— 其实还可以再分为两部分：

(1). Best-Notes 前端，假设网址为

![](https://pic2.zhimg.com/v2-9f7e3fa9ed3445c3f39b2c888f2cf4c9_1440w.png)

(2).Best-Notes 的后端（服务器），假设后端的地址为

![](https://pica.zhimg.com/v2-04112a77c14e1f1068901a2e293926bc_1440w.png)

Authorization Server 就是 GitHub 的授权服务器，地址为

![](https://pic3.zhimg.com/v2-96a1d9df095bdee747f879b49aa7368e_1440w.png)

Resource Server 就是存放我们 Gist 的服务器，地址为

![](https://pic4.zhimg.com/v2-906158104779a1416f00ced22d63c8eb_1440w.png)

下图是整个流程的粗略图示

![](https://pic1.zhimg.com/v2-8cd30e0e99119168d009cf6621864aa6_1440w.jpg)

### 准备工作——在 GitHub Authorization Server 注册 Best-Notes

准备工作——在 GitHub Authorization Server 注册 Best-Notes

这一步非常重要，注册了 Application 后面的流程才能正常进行，而且很多参数值都来自于注册时的值。

GitHub 注册 OAuth App 的地址： https://github.com/settings/developers

注册成功后的界面是这样的

![](https://pic1.zhimg.com/v2-83d3781e89aefb3b43878be0f9bfaa76_1440w.jpg)

![](https://pic2.zhimg.com/v2-f015f86bf4c43ff93e07cea0c9595b3f_1440w.jpg)

现在不理解里面的内容不要紧，后面马上就会讲到。

### 流程解析

接下来一步步详细地解析这个流程：

:::steps

1.  用户访问 笔记 web app **Best-Notes**，即

    ![](https://pica.zhimg.com/v2-c01aa5c1da76cfdc794c426250e77764_1440w.png)

2.  用户想使用 **Best-Notes** 导入 gist 的功能，于是点击某个网站按钮

    ![触发OAuth授权的按钮](https://pic3.zhimg.com/v2-aa23af88c35173f1feef1d7aa96bdad0_1440w.jpg)

3.  这时 **Best-Notes** 会将浏览器重定向到一个新的网址。

    **这是 OAuth 里第一个非常重要的 URL**，它的格式类似这样：

    ![](https://pica.zhimg.com/v2-7defd62134059a33ea5c725f57d3751c_1440w.png)

    用户就会看到 GitHub 网站的一个授权网页， **注意这个 URL 是在 GitHub 域名下的**，即接下来的交互是用户跟 GitHub 之间进行的，与 **Best-Notes** 的前后端都没有关系。

    ![](https://pic2.zhimg.com/v2-607afb0df1e51166726815c6fccf739f_1440w.jpg)

    这个页面详细地描述了很多信息：

    1）授权的 Application 的名字、图标

    2）即将授予的权限

    3）授权成功后重定向的地址

    这些信息都跟 URL 里的参数关系密切。

    一起看看 URL 里的参数：

    1）`client_id` —— 这个参数是帮助 GitHub Authorization Server 识别第三方应用的（在本文中就是 笔记 web app **Best-Notes**）—— Authorization Server 会在数据库中确认这个 client_id 是否合法；根据这个 client_id 预先注册的信息，向用户展示该 Application 的名字、图标、描述等信息。

    2）`redirect_uri` —— 在用户授权成功后，将会被重定向到的地址，上面这个例子中就是

    ![](https://pica.zhimg.com/v2-078f40ebb31d30d094d07690afd0efec_1440w.png)

    注意！这个 redirect_uri 也需要在注册 Application 时提供，**Authorization Server 会在数据库中确认当前的 redirect_uri 与 client_id 是否匹配** —— 为什么？假如不检查，黑客使用同样的 client_id ，把 redirect_uri 换成恶意网站的网址。用户以为自己授权给的是 **best-notes** ，却被重定向到 恶意网站 去，并让恶意网站拿到了 authorization code（这个概念后面会讲解）！

    3）`scope` —— 这个参数指定了希望用户授予的权限范围，比如 GitHub 提供了这些 scope （[Scopes for OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes)） 例：repo，gist，notifications，user，workflow 等。

    在我们的例子中使用了 gist 作为 scope；

    scope 通常支持多个值；

    scope 对应的权限都会显示在授权页面，让用户清楚地知道自己即将授予 **Best-Notes** 什么权限。

    4）`state` —— 这通常是个可选的参数，值通常是个随机值；在用户授权结束后，**这个参数会被原封不动地附加在重定向的地址后面**。（后面会继续讲解这个参数的作用）

4.  授权结束后，浏览器会**被 GitHub**重定向到一个新的 URL， **这是第二个非常重要的 URL。**

    在 **Best-Notes** 这个例子中，这个 URL 大概是这个样子

    ![](https://pic3.zhimg.com/v2-09e2d809e496ec70b971a61cab20b060_1440w.png)

    > [!WARNING]
    >
    > - 这次的**重定向是 GitHub Authorization Server 发起的**（URL 的参数值也是 GitHub Authorization Server 生成的）
    >
    > - 这个 URL 的前半部分
    >
    > ![](https://picx.zhimg.com/v2-efb9fa1eb1d62d04db1f657a75a69b3f_1440w.png)
    >
    > 就是第一个 URL 中 redirect_uri 的值
    >
    > - 参数 state 的值也与 第一个 URL 的参数 state 值一样
    >
    > - 参数 code 就是 OAuth 中一个非常重要的概念 —— Authorization code （授权码），之后这个 Authorization code 将会被用来获得最终的 Access token
    > - **划重点：这个 URL 实际上是对 Application 后端 API 的一个 GET 请求**，而不是一个 Html 页面！也就是说浏览器在访问这个 URL 的时候，Application 后端并不会返回一个 Html 页面，相反的是，Application 后端根据 URL 中的参数（code 和 state）给 GitHub Authorization Server 发送请求获取 Access Token，成功后，就会再次告诉浏览器重定向到 Application 的前端网址即
    >
    > ![](https://picx.zhimg.com/v2-dfddffe989ce51315a3e888f648c8b19_1440w.png)

    —— 这个过程通常非常快，因此**用户几乎不会察觉浏览器的 URL 其实变化了两次！**（读者们可以再看看 codepen 的视频）

    ![](https://pica.zhimg.com/v2-d82c3082541382fa977c94dff4aa2fa0_1440w.jpg)

    （上图中

    ![](https://picx.zhimg.com/v2-b77e89c1d8278b11e425ef3db8107f9d_1440w.png)

    的返回状态是 [302](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/302) (即重定向) 且 location 指向

    ![](https://pic4.zhimg.com/v2-681a2a2a1931f76a254ecbfa426ce5c5_1440w.jpg)

    ）

    对于用户而言，这一步非常快，到此整个 OAuth 流程已经走完。但**对于 Application 后端而言，这一步的工作量其实不小**，我们来仔细看看这中间发生的所有细节。

    当浏览器访问

    ![](https://picx.zhimg.com/v2-9c443dffe24f9e02ba7cd0f821898309_1440w.png)

    时，Application 后端获得 GitHub 生成的 Authorization code 以及 Application 在第 3 步中生成的随机字符串 state。

    随机字符串 state 的用处： 用来**抵御 CSRF 攻击** —— 这个 state 在实现上应该是一个随机字符串，在正常 OAuth 流程中，这个步骤中获得的 state 肯定和发起 OAuth 时生成的 state 相同；如果黑客发起 CSRF 攻击，即伪造一个

    ![](https://pic3.zhimg.com/v2-9bbea17fdd41e03dbb673c1dfe6dbb54_1440w.png)

    , Application 后端发现这个 state 对应不上，就可以判断这是个假的请求，立刻拒绝。

5.  通过了 state 校验后，Application 后端根据 Authorization code 生成另一个 URL，这是**第三个非常重要的 URL**，格式类似下面这样

    ![](https://pic3.zhimg.com/v2-47b40479ae843c2b8a3028131a2de6a4_1440w.png)

    Application 后端发请求给这个 URL 就能获取到最终的 Access Token。

    解析这个 URL 的参数：

    - `code` —— 这就是 Authorization code 的值

    - `client_id` —— 跟前面一样，这个 client_id 可以帮助 GitHub Authorization Server 识别第三方应用的（在本文中就是 **Best-Notes**）

    - `client_secret` —— 这是一个密码，在注册 Application 的时候，GitHub 会生成这个字符串，**用于 GitHub Authorization Server 验证 Application 后端的身份** —— 什么意思呢？还记得第三步中，用户跳转到 GitHub 授权页面时，client_id 其实是暴露在浏览器地址栏中的，因此任何人（包括黑客）都能看到这个 client_id，因此如果只是使用 client_id 做验证是不安全的。—— 简言之，client_id 和 client_secret 在这一步中用于向 GitHub Authorization Server 证明这个请求真的是来自 Application（的后端）

    - `redirect_uri` —— 这个值必须跟前面的一样，否则也会被 GitHub Authorization Server 拒绝。个人认为，这个参数在这边存在的意义是比较小的，毕竟根据 client_id 和 client_secret 就已经能验证 Application 的身份了，根据[官方文档](https://www.oauth.com/oauth2-servers/redirect-uris/redirect-uri-validation/#granting-access-tokens)，这个参数只是为了多加一层安全保护。

6.  Application 后端发送请求给这个 URL 后就能成功拿到 Access Token，GitHub 的 Access Token 大概长这个样子：

    > gho_GWabcxD0gXu1OtVAX678xm2EShpxbx0RY123

7.  最后，Application 后端就可以拿着这个 Access Token 发请求给 GitHub Resource Server 如

    ![](https://picx.zhimg.com/v2-364605e1a24a9e4746e632858e9700d9_1440w.jpg)

    去获取用户的 Gists 了。

:::

## 最后回答开头的问题

1. OAuth 解决的是 Authentication 还是 Authorization 问题？

答： 前面回答过了

2. 为什么浏览器的 URL 有时候需要指向我正在用的 web app，有时候指向的是授权方（比如，GitHub 或 Google）？（亦或者你完全没发现 URL 的 domain 曾经变化过）

答： 授权页面必须是在授权方比如 GitHub 上进行的（即前文的第 3 步），这样才能保证是用户自己授权而不是 Application 代为授权 —— 假设一个黑客写了一个恶意网站，故意触发 OAuth 流程，打开了 GitHub 授权页面，由于 GitHub 授权页面处在 GitHub 域名下，恶意网站上的 JavaScript 不可能跨域名去操作。

3. OAuth 流程中的 URL 为什么需要那么多参数？每个参数背后的设计意图是什么？可以省略吗？

答：在上面的详细流程里讲解了。

4. Authorization code 的作用是什么？直接传回 Access Token 不行吗？

答：为了更安全。在第二个重要的 URL 中，authorization code 其实会暴露在浏览器的访问历史中，但是由于需要 Application 后端使用这个 code 再次发请求去拿到 Access Token，因此 authorization code 被看到并不构成安全问题。相反，如果在第二个重要的 URL 中把 authorization code 换成 Access Token 可能被窃取并直接使用。

5. Authorization code 和 Access Token 的格式是什么，有要求吗？

答：OAuth 并不限制 Authorization code 和 Access Token 的格式。在 GitHub OAuth 实现中，这 2 个都是一个随机字符串；而在其他地方的实现有可能是 JWT。

## 总结

纸上得来终觉浅，绝知此事要躬行！

希望读者看完这篇文章后可以自己去实践一下 OAuth 的流程，GitHub 的 OAuth 注册和开发体验都很不错，有兴趣的同学可以试试。有网络限制的同学，也可以试试微博、微信的 OAuth。

## 参考链接

[What is Authorization? - Examples and definition - Auth0](https://auth0.com/intro-to-iam/what-is-authorization)

[Authorization vs Authentication - OAuth 2.0 Simplified](https://www.oauth.com/oauth2-servers/openid-connect/authorization-vs-authentication/)

[OAuth is Not Authentication](https://www.scottbrady.io/oauth/oauth-is-not-authentication)

[OpenID Connect Basic Client Implementer's Guide 1.0 - draft 40](https://openid.net/specs/openid-connect-basic-1_0.html)

[Redirect URL Validation - OAuth 2.0 Simplified](https://www.oauth.com/oauth2-servers/redirect-uris/redirect-uri-validation/)

[Resources in the REST API](https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?apiVersion=2022-11-28)

[Authorizing OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

[302 Found - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/302)

[Prevent Attacks and Redirect Users with OAuth 2.0 State Parameters](https://auth0.com/docs/secure/attack-protection/state-parameters)
