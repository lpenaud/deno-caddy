# Deno Caddy

Deno-based utilities for Caddy log parsing and processing.

## Logs

Parse JSON logs into a human-readable format.

### Format

```
[time] [method] [url] [status code colored] [remote ip]
```

### Status code colors

- [Successful responses (2xx)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#successful_responses): green
- [Redirection messages (3xx)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#redirection_messages): cyan
- [Client error responses (4xx)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#client_error_responses): yellow
- [Server error responses (5xx)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#server_error_responses): red
- Others: gray
