import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { Input } from "./Input";
import { Spinner } from "./Spinner";
import { postLogin } from "../endpoints/auth/login_POST.schema";
import styles from "./RoleLogin.module.css";
const titles = {
    candidate: "Candidate sign in",
    examiner: "Examiner sign in",
    admin: "Control room",
};
export const RoleLogin = ({ role, settings, onSignedIn, className }) => {
  const queryClient = useQueryClient();
    const [id, setId] = useState("");
    const [secret, setSecret] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const setup = role === "admin" && settings && !settings.adminConfigured;
    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        if (setup && secret !== confirm) {
            setError("The two passwords do not match.");
            return;
        }
        setBusy(true);
        try {
            const res = role === "admin"
                ? await postLogin({ role: setup ? "admin_setup" : "admin", password: secret })
                : role === "examiner"
                    ? await postLogin({ role: "examiner", username: id, pin: secret })
                    : await postLogin({ role: "candidate", examNumber: id, pin: secret });
            if (role === "admin") {
        queryClient.invalidateQueries({ queryKey: ["publicSettings"] });
      }
      onSignedIn({ token: res.token, name: res.name });
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className={`${styles.wrap} ${className ?? ""}`}>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.brand}>
          {settings?.logoUrl ? <img src={settings.logoUrl} alt="" className={styles.logo}/> : null}
          <div className={styles.institution}>{settings?.institutionName ?? ""}</div>
          <div className={styles.examTitle}>{settings?.examTitle ?? ""}</div>
        </div>
        <h1 className={styles.title}>{setup ? "Set the administrator password" : titles[role]}</h1>
        {setup ? (<p className={styles.hint}>
            First time here. Choose the password that will protect the control room on every device.
          </p>) : null}

        {role !== "admin" ? (<label className={styles.field}>
            <span>{role === "candidate" ? "Exam number" : "Username"}</span>
            <Input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="characters" placeholder={role === "candidate" ? "e.g. NS/001" : "e.g. examiner1"} required/>
          </label>) : null}
        <label className={styles.field}>
          <span>{role === "admin" ? "Password" : "PIN"}</span>
          <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete={setup ? "new-password" : "current-password"} inputMode={role === "admin" ? undefined : "numeric"} required/>
        </label>
        {setup ? (<label className={styles.field}>
            <span>Confirm password</span>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required/>
          </label>) : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Spinner size="sm"/> : null}
          {setup ? "Save and continue" : "Sign in"}
        </Button>
        <Link to="/" className={styles.back}>
          ← Choose another device role
        </Link>
      </form>
    </div>);
};
