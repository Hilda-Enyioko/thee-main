import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken, getSessionKind } from '../lib/auth';

export default function StaffRoute(){
  return getAccessToken() && getSessionKind()==='staff' ? <Outlet/> : <Navigate to="/staff/login" replace/>;
}
