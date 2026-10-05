# env-check

A tiny CLI that checks whether required environment variables are present before you run your app.

## Why?

Many projects need environment variables such as:

* `DATABASE_URL`
* `JWT_SECRET`
* `OPENAI_API_KEY`

If one is missing, your application can fail when you start it.

`env-check` checks your `.env.example` against your `.env` and tells you which variables are missing.

## Usage

Run:

```bash
env-check
```

If everything is present:

```text
✓ All required environment variables are present.
```

If something is missing:

```text
✗ Missing environment variables:
  - OPENAI_API_KEY
```

## Security

Never commit your `.env` file to Git.

Keep `.env` inside `.gitignore`.

## License

MIT
