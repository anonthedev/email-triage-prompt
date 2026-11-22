export default function PrivacyPage() {
  return (
    <main className="legal">
      <h1>Privacy policy</h1>
      <p className="note">22 November 2026</p>
      <p>
        Triage reads a short slice of unread Gmail so it can put the messages that need a person first. This policy covers
        the copy of Triage you sign in to.
      </p>
      <h2>Account</h2>
      <p>
        Sign-in asks Google for your name, email address, profile, and read-only access to Gmail. Triage does not send,
        delete, label, or change mail.
      </p>
      <h2>Mail</h2>
      <p>Opening Unread loads up to 25 unread inbox messages. For each one Triage uses the sender, subject, date, and body.</p>
      <p>
        That text is sent to the classifier configured for this copy of the app, so it can return a category, a priority,
        and whether a person has to decide the outcome. The usual host is https://api.typesafe.ai. If the operator points
        the app at a local Laya server, the text goes there instead. The classifier does not write a reply.
      </p>
      <h2>What stays on the server</h2>
      <ul>
        <li>Your Gmail access token and refresh token, inside the encrypted session cookie, so a later visit can read mail again.</li>
        <li>The classification for a message, under .data/classifications, so a reload does not call the classifier again.</li>
      </ul>
      <p>
        Signing out clears that session. To take the Gmail permission back, remove Triage at
        https://myaccount.google.com/permissions.
      </p>
      <h2>Sharing</h2>
      <p>
        Triage does not sell account data or mail. Message text leaves the server for the Gmail request that fetched it and
        for the classifier request above.
      </p>
    </main>
  );
}
