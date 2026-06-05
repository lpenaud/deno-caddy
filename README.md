# Deno Caddy

Deno-based utilities for Caddy log parsing and processing.

## Logs

Parse JSON logs into a human-readable format.

### Format

```
[time] [method] [url] [status code colored] [remote ip]
```

### Status code colors

- [Successful responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#successful_responses)
  (2xx): green
- [Redirection messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#redirection_messages)
  (3xx): cyan
- [Client error responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#client_error_responses)
  (4xx): yellow
- [Server error responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#server_error_responses)
  (5xx): red
- Others: gray
