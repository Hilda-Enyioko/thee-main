import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { setSessionKind, setTokens } from '../lib/auth';
import { Link } from 'react-router-dom';
import './Login.css';

export default function StaffLogin(){
 const navigate=useNavigate(); const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const r=await api.post('/staff/auth/login/',{email,password});setTokens(r.data.tokens.access,r.data.tokens.refresh);setSessionKind('staff');navigate('/staff')}catch{setError('Invalid staff credentials.')}finally{setBusy(false)}};
 return <main className="login-page auth-page staff-auth-page"><header className="staff-auth-nav"><Link to="/">thee<span>insurance</span></Link><small>Internal operations</small></header><section className="auth-shell"><div className="login-card auth-card"><p className="onboarding-overline">TheeInsurance operations</p><h1>Staff sign in.</h1><p className="form-subtext">Use your authorized staff account to manage platform operations.</p>{error&&<p className="form-error-banner">{error}</p>}<form className="login-form" onSubmit={submit}><label>Work email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn-primary" disabled={busy}>{busy?'Signing in…':'Sign in securely'}</button></form></div><aside className="staff-auth-aside"><span>Operations / Restricted</span><h2>Keep the<br /><em>system moving.</em></h2><p>Review verification, access and insurance activity from one private workspace.</p></aside></section></main>
}
