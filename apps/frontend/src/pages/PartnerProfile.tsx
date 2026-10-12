import { useEffect, useState } from 'react';
import PortalLayout from '../components/PortalLayout';
import { api } from '../lib/api';

type Profile = { name:string; partner_type:string; slug:string; phone_number:string; address:string; website:string; kyc_status:string; commission_rate?:string; naicom_licence_number?:string; settlement?:{account_name:string;account_number:string;bank_code:string} };
type Member = { id:string; first_name:string; last_name:string; email:string; role:string; is_active:boolean };
const errorText=(e:unknown)=>{const d=(e as {response?:{data?:{error?:string;detail?:string}}})?.response?.data;return d?.error||d?.detail||'Something went wrong. Please try again.'};

export default function PartnerProfile(){
 const [profile,setProfile]=useState<Profile|null>(null),[members,setMembers]=useState<Member[]>([]),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[newKey,setNewKey]=useState('');
 const load=async()=>{try{const [p,t]=await Promise.all([api.get('/partner/profile/'),api.get('/partner/team/')]);setProfile(p.data);setMembers(t.data)}catch(e){setMessage(errorText(e))}};
 useEffect(()=>{load()},[]);
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(!profile)return;setSaving(true);setMessage('');try{const r=await api.patch('/partner/profile/',{phone_number:profile.phone_number,address:profile.address,website:profile.website,settlement:profile.settlement});setProfile(r.data);setMessage('Profile saved.')}catch(e){setMessage(errorText(e))}finally{setSaving(false)}};
 const regenerate=async()=>{const password=window.prompt('Confirm your password to generate a new API key.');if(!password)return;try{const r=await api.post('/partner/api-key/regenerate/',{password});setNewKey(r.data.api_key);setMessage('The old key is now invalid. Save the new key immediately.')}catch(e){setMessage(errorText(e))}};
 const deactivate=async(id:string)=>{if(!window.confirm('Deactivate this team member?'))return;try{await api.post(`/partner/team/${id}/deactivate/`);load()}catch(e){setMessage(errorText(e))}};
 if(!profile)return <PortalLayout title="Profile"><div className="portal-card">Loading your organization…</div></PortalLayout>;
 const settlement=profile.settlement??{account_name:'',account_number:'',bank_code:''};
 return <PortalLayout title="Your organization" eyebrow="Profile & access"><div className="dashboard-grid" style={{gridTemplateColumns:'minmax(0,1.5fr) minmax(280px,.8fr)'}}>
  <form className="portal-card" onSubmit={save}><h2>Business & settlement details</h2>{message&&<p className="portal-message">{message}</p>}<div className="portal-form-grid">
   <label className="portal-field"><span>Business name</span><input value={profile.name} disabled /></label><label className="portal-field"><span>Partner type</span><input value={profile.partner_type} disabled /></label>
   <label className="portal-field"><span>Phone number</span><input value={profile.phone_number} onChange={e=>setProfile({...profile,phone_number:e.target.value})}/></label><label className="portal-field"><span>Website</span><input value={profile.website} onChange={e=>setProfile({...profile,website:e.target.value})}/></label>
   <label className="portal-field portal-field-full"><span>Business address</span><textarea value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})}/></label>
   <label className="portal-field"><span>Account name</span><input value={settlement.account_name} onChange={e=>setProfile({...profile,settlement:{...settlement,account_name:e.target.value}})}/></label><label className="portal-field"><span>10-digit account number</span><input value={settlement.account_number} onChange={e=>setProfile({...profile,settlement:{...settlement,account_number:e.target.value}})}/></label>
   <label className="portal-field"><span>Bank code</span><input value={settlement.bank_code} onChange={e=>setProfile({...profile,settlement:{...settlement,bank_code:e.target.value}})}/></label>
  </div><div className="portal-actions"><button className="portal-button" disabled={saving||profile.kyc_status!=='approved'}>{saving?'Saving…':'Save changes'}</button>{profile.kyc_status!=='approved'&&<small>Profile edits unlock after KYC approval.</small>}</div></form>
  <aside className="dashboard-grid"><div className="portal-card"><h2>Verification</h2><span className={`pill ${profile.kyc_status}`}>{profile.kyc_status.replace('_',' ')}</span><p>Your partner key becomes active once verification is approved.</p></div><div className="portal-card"><h2>API key</h2><p>Rotate your integration key if it is lost or exposed. The previous key stops working immediately.</p><button type="button" className="portal-button secondary" onClick={regenerate}>Regenerate key</button>{newKey&&<><p className="portal-message"><code>{newKey}</code></p><button className="portal-button" onClick={()=>navigator.clipboard.writeText(newKey)}>Copy key</button></>}</div></aside>
 </div><section className="portal-card" style={{marginTop:20}}><h2>Team members</h2><table className="portal-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>{members.map(m=><tr key={m.id}><td>{m.first_name} {m.last_name}</td><td>{m.email}</td><td>{m.role.replaceAll('_',' ')}</td><td><span className={`pill ${m.is_active?'approved':'rejected'}`}>{m.is_active?'Active':'Inactive'}</span></td><td>{m.is_active&&<button className="portal-button secondary" onClick={()=>deactivate(m.id)}>Deactivate</button>}</td></tr>)}</tbody></table></section></PortalLayout>
}
