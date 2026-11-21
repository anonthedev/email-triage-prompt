# Triage

A small inbox for faculty and office staff. It reads a short slice of unread Gmail, or the sample fixtures, and asks a System One model (Jev or Laya) for three things: what kind of mail it is, how soon it needs attention, and whether a person has to decide the outcome.

Nothing is sent. The models do not write a reply.

## How to read a row

```
Category   urgent   0.34 weak
Priority   urgent   0.30 weak
Staff can answer
```

Those are three separate answers.

- **Category** is the kind of mail: advising, grades, scheduling, admin, research, vendor, fyi, or urgent. Here the model thinks the message is the urgent kind.
- **Priority** is how soon to deal with it: low, normal, high, or urgent. Here it also thinks the timing is urgent.
- The number is how sure that label is, from 0 to 1. **Weak** means the number is under 0.50, so treat the label as a guess. Both calls above are weak.
- **Staff can answer** means a person does not have to decide the outcome. An acknowledgement, a scheduling reply, or filing the note is enough. **Needs a person** is the other result: an extension, a regrade, money, conduct, or someone in distress. That flag turns on only when its own probability is at least 0.50. A low number there is a confident no, not a weak label.

Open a row for the message body and the rest of the probabilities. If Laya only saw the opening of a long message, the page says so.

Above the list you can filter by category, priority, and decision, keep only weak calls, and sort by priority, date, category, or least sure.

## Run the inbox

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000. Without Google credentials the page still classifies the ten fixtures in `fixtures/`.

## Environment

| Name | What it is |
| --- | --- |
| `TYPESAFE_API_KEY` | Bearer token for hosted Jev. Local Laya accepts any value, often `local`. |
| `TYPESAFE_BASE_URL` | `https://api.typesafe.ai`, or `http://localhost:11435` for a local Laya server. |
| `TYPESAFE_MODEL` | `jev-latest` or `laya`. Jev reads a full message. Laya reads about the first thousand characters. |
| `GOOGLE_CLIENT_ID` | OAuth web client id. |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret. |
| `AUTH_SECRET` | Session secret. `openssl rand -base64 32` |

## Google sign-in

Create an OAuth web client in Google Cloud, enable the Gmail API on that project, and register this redirect URI:

```
http://localhost:3000/api/auth/callback/google
```

The app asks for `openid`, `email`, `profile`, and `gmail.readonly`. While the consent screen is in **Testing**, add the Google account you sign in with under **Test users**. Otherwise Google refuses the login with “can only be accessed by developer-approved testers.” Test-mode refresh tokens expire after 7 days, so you sign in again about once a week. Publishing the app for other people requires Google’s restricted-scope review; that is not needed for your own mail.

After sign-in, **Unread** loads up to 25 unread inbox messages. Results are cached in `.data/` by message id and body, so a reload does not call the model again.

## Commands

```bash
npm run triage -- fixtures/extension.json
npm run triage -- -          # one JSON email on stdin
npm run eval                 # score the fixtures against their labels
npm test
npm run check
```

A bare email needs `from`, `subject`, and `body`. A fixture file may wrap those in `email` and include an `expect` block for `eval`.
