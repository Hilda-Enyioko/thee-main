import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { setSessionKind, setTokens } from '../lib/auth';

export default function StaffLogin(){
 const navigate=useNavigate(); const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const r=await api.post('/staff/auth/login/',{email,password});setTokens(r.data.tokens.access,r.data.tokens.refresh);setSessionKind('staff');navigate('/staff')}catch{setError('Invalid staff credentials.')}finally{setBusy(false)}};
 return <main className="login-page"><div className="login-card"><p className="onboarding-overline">TheeInsurance operations</p><h1>Staff sign in</h1>{error&&<p className="form-error-banner">{error}</p>}<form className="login-form" onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn-primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></div></main>
}
