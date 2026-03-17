---
title: Fixing API Return Value That Should Change But Doesn't
createTime: 2025/9/30 18:10:23
permalink: /en/blog/yabt7ynj/
tags:
  - debug
---

> This is a debugging experience

## What Happened

I was deploying a small project that passed local testing. At the time, it only had three APIs: /login, /sign, and /links, where /links returns a list.

Locally, I could add and remove items from the list normally and get the latest values. However, when requesting /links from the cloud, it always returned a JSON with an empty list, while the other two APIs worked fine.

## Debugging Process

I was quite confused when I saw this. First, I suspected the nginx configuration:

```nginx
location ~ ^/(sign|login|links) {
    proxy_pass http://127.0.0.1:xxxx;
    ...
}
```

This looked normal - at least if something was going to break, all three should break together.

Then I wondered if there were no database write permissions, but quickly ruled that out.

I felt helpless because everything worked fine locally. So I added some debugging code as usual, but unsurprisingly found nothing.

I believed the problem was still on the server, so I checked the nginx monitoring logs with `tail -f /var/log/nginx/access.log`.

I found a clue - only /sign and /login requests went through nginx. So where did /links go?

## Conclusion

The answer is that I had configured a CDN and forgot that it cached API responses, so /links requests were directly returned by the CDN with the initial cached record.

In summary, when you have API services, make sure to check your CDN configuration.

> Although this was a foolish experience, debugging this issue while forgetting about the CDN modification was extremely painful and confusing, so I'm recording it here.