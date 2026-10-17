export function Legal({ kind }: { kind: string }) {
  return (
    <div className="legal-copy">
      <span className="eyebrow">ARCADE BETA · 17 OCTOBER 2026</span>
      {kind === "privacy" ? (
        <>
          <p>
            Arcade fights run on your device. Playing does not require an
            account. Your nickname, campaign checkpoint, previous move history
            for adaptive rivals, and audio settings stay in this browser. Arcade
            moves are not sent to the server.
          </p>
          <h3>Optional accounts</h3>
          <p>
            If you create an account, Cloudflare D1 stores your email, reserved
            username, password hash and signed-in sessions. Better Auth hashes
            passwords; plaintext passwords are not stored. Signup does not
            require email confirmation. Password-reset email is not available
            yet. Session records include IP address and browser information for
            account security. Previous online match scores may remain associated
            with an account; online play is currently paused.
          </p>
          <h3>Sponsor enquiries</h3>
          <p>
            Submitting an enquiry stores your brand, contact email, website,
            message and selected wall in D1 for the owner to review. The form
            does not charge money, reserve a space or automatically publish
            artwork. Direct sponsor boards load local artwork without
            third-party ad scripts or tracking pixels. Visiting a sponsor
            website is your choice and that website has its own privacy policy.
          </p>
          <h3>Your choices</h3>
          <p>
            You can sign out or permanently delete your account, sessions,
            stored online results and sponsor enquiries from the account panel
            by confirming your password. Clear this site's browser data to erase
            local arcade progress and preferences. Cloudflare may process
            network logs under its own policy.
          </p>
          <p>
            Only essential cookies and local storage are used. We do not sell
            personal information. Send privacy questions through the project's
            GitHub issue tracker; do not post passwords or private account
            details there. A dedicated support email will be listed when
            configured. Intended for ages 16 and over.
          </p>
        </>
      ) : kind === "terms" ? (
        <>
          <p>
            Yaba Fight is a free experimental arcade fighting game for players
            aged 16 and over. By playing, you agree to fair play and these beta
            terms.
          </p>
          <h3>The arcade</h3>
          <p>
            Play seven computer-controlled rivals locally, or practise against
            one. Adaptive rivals use weighted rules based on your previous
            choices. Parry has a clearly labelled 50% success chance; there are
            no cash stakes or prizes. Online play is paused. Local progress
            belongs to this browser and is not synchronised through your
            account.
          </p>
          <h3>Your account</h3>
          <p>
            Use an email you control and save your password safely. Email
            ownership is not verified at signup, and password recovery is
            deferred. Reserved account usernames are unique without regard to
            capitalisation. A local arcade nickname does not reserve an account
            username.
          </p>
          <h3>Sponsorship</h3>
          <p>
            Enquiries begin a discussion. Pricing, dates, artwork and payment
            must be agreed with the owner separately. This beta has no checkout,
            automatic bookings or renewals. Sponsored links open only after an
            explicit click. Do not submit artwork or brand material you do not
            have permission to use.
          </p>
          <h3>Availability and support</h3>
          <p>
            Balance, artwork and features may change. The game is provided as
            available, subject to rights that cannot be excluded by applicable
            law. Original game artwork may not be redistributed without
            permission; third-party assets retain their own licences. Report
            bugs through the project's GitHub issue tracker. No domain or paid
            plan is selected automatically.
          </p>
        </>
      ) : (
        <>
          <p>
            Only essential cookies and browser storage are used. No analytics or
            advertising trackers are loaded.
          </p>
          <h3>Optional account cookies</h3>
          <p>
            A secure, HttpOnly session cookie keeps you signed in. Sessions
            expire after 30 days and may refresh when you return. Authentication
            cookies use the yf prefix. Signing out revokes the current session;
            deleting an account removes all its sessions. Passwords are never
            kept in local storage.
          </p>
          <h3>On this device</h3>
          <ul>
            <li>
              <strong>yf-name:</strong> your local fighter nickname.
            </li>
            <li>
              <strong>yf-arcade-v2:</strong> campaign checkpoint, difficulty and
              recent moves used by adaptive rivals.
            </li>
            <li>
              <strong>yf-arcade-cleared:</strong> whether you completed the
              arcade.
            </li>
            <li>
              <strong>yf-arcade-audio:</strong> volume, music and mute
              preferences.
            </li>
          </ul>
          <p>
            Older yf-stats, yf-sound and yf-audio preferences may remain from
            previous versions until you clear site data. Local data stays in
            this browser until cleared. There are no optional trackers to
            accept.
          </p>
        </>
      )}
    </div>
  );
}
