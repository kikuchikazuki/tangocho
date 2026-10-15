import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUp, setSignUp] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!supabase) {
      setMessage("Supabaseの設定がまだ完了していません。");
      return;
    }
    if (!email.trim() || password.length < 6) {
      setMessage("メールアドレスと6文字以上のパスワードを入力してください。");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = signUp
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (signUp) setMessage("確認メールを確認してください。");
  }

  return (
    <main className="app auth-screen">
      <h1>単語帳</h1>
      <h2>{signUp ? "新規登録" : "ログイン"}</h2>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        type="password"
        placeholder="パスワード（6文字以上）"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button onClick={submit} disabled={busy}>
        {busy ? "処理中..." : signUp ? "新規登録" : "ログイン"}
      </button>
      <button className="secondary" onClick={() => setSignUp((value) => !value)}>
        {signUp ? "ログインへ戻る" : "新規登録はこちら"}
      </button>
      {message && <p className="message">{message}</p>}
    </main>
  );
}
