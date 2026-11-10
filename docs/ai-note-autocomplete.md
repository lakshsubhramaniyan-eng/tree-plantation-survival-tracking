# AI field note autocomplete

The dashboard includes an AI-assisted writing panel that drafts a concise field observation from details supplied by the signed-in user. The draft is editable and should be checked for accuracy before it is added to a field record.

## Configure

1. Create a Gemini API key in Google AI Studio.
2. Add the key to the server environment as `GEMINI_API_KEY` (see [.env.example](../.env.example)). Keep this secret on the server; do not add it to the client environment or commit a real key.
3. Restart the API server.
4. Open the dashboard, enter at least 10 characters describing observed conditions, and select **Generate note**. Use **Copy note** to paste the editable draft into an observation.

The API route is `POST /api/auth/autocomplete` and requires the normal bearer-token authentication. It accepts a `context` string from 10 to 600 characters and returns a `suggestion`. If the server key is missing, the endpoint responds with `503` and a configuration message. Provider failures are reported without exposing provider responses or the API key.

AI output can be inaccurate. Include observations only, avoid sensitive personal information, and verify all generated statements before saving them.
