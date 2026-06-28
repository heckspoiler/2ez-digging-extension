import { useState } from 'react';

import '@fontsource/epilogue/400.css';
import '@fontsource/epilogue/500.css';
import '@fontsource/epilogue/600.css';
import '@fontsource/epilogue/700.css';
import './App.css';
import { login } from './lib/auth';
import { useAuth } from './hooks/useAuth';
import { useScanner } from './hooks/useScanner';
import type { Track } from './types';

function formatOffset(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      // useAuth observes the storage change and swaps to the scanner view.
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="login"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <img className="brand" src="/icon32.png" alt="" width={44} height={44} />
      <h1>chop</h1>
      <p className="subtitle">Log in to scan SoundCloud mixes.</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}

function TrackRow({ track }: { track: Track }) {
  return (
    <li className="track">
      <span className="offset">{formatOffset(track.offset_seconds)}</span>
      {track.cover_url ? (
        <img className="cover" src={track.cover_url} alt="" width={36} height={36} />
      ) : (
        <span className="cover cover--empty" />
      )}
      <span className="track-meta">
        <span className="track-title">{track.title}</span>
        <span className="track-artist">{track.artist}</span>
      </span>
      {track.shazam_url && (
        <a className="track-link" href={track.shazam_url} target="_blank" rel="noreferrer">
          ↗
        </a>
      )}
    </li>
  );
}

function ScannerView({
  email,
  onLogout,
}: {
  email: string | null;
  onLogout: () => void;
}) {
  const { url, setUrl, phase, set, tracks, error, scan, reset, isLoading, hasTracks } =
    useScanner();
  const finished = phase === 'complete' || phase === 'error';

  return (
    <div className="scanner">
      <header className="topbar">
        <span className="account" title={email ?? undefined}>
          {email ?? 'Logged in'}
        </span>
        <button className="logout" type="button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <form
        className="scanform"
        onSubmit={(e) => {
          e.preventDefault();
          void scan(url);
        }}
      >
        <input
          type="url"
          placeholder="SoundCloud mix URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={isLoading}>
          {phase === 'submitting' ? '…' : isLoading ? 'Scanning' : 'Chop'}
        </button>
      </form>

      {finished && (
        <button className="reset" type="button" onClick={reset}>
          Scan another mix
        </button>
      )}

      {set && (
        <div className="setinfo">
          {set.image_url && <img src={set.image_url} alt="" width={40} height={40} />}
          <div className="setinfo-meta">
            <p className="set-title">{set.title ?? set.url}</p>
            {set.artist && <span className="set-artist">{set.artist}</span>}
          </div>
        </div>
      )}

      {isLoading && !hasTracks && (
        <p className="status">Chopping mix… this can take a minute.</p>
      )}
      {error && <p className="error">{error}</p>}
      {phase === 'complete' && !hasTracks && (
        <p className="status">No tracks identified.</p>
      )}

      {hasTracks && (
        <ol className="tracklist">
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} />
          ))}
        </ol>
      )}
    </div>
  );
}

function App() {
  const { session, loading, logout } = useAuth();

  if (loading) {
    return <div className="loading">Loading…</div>;
  }

  return session ? (
    <ScannerView email={session.email} onLogout={() => void logout()} />
  ) : (
    <LoginView />
  );
}

export default App;
