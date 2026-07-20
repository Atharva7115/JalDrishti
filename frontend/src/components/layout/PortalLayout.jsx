import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Droplets, HelpCircle, LogIn, Menu, Search, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { OfflineBanner } from '../common/UI';

const navItems = [
  ['Home', '/'], ['Groundwater Map', '/map'], ['Stations', '/stations'], ['District Status', '/districts'], ['Forecast', '/public-status'], ['Alerts', '/alerts'], ['Data Explorer', '/researcher'], ['Reports', '/reports'], ['About', '/about'],
];

export function Logo() {
  return <Link className="brand" to="/" aria-label="JalDrishti home"><span className="brand-mark" aria-hidden="true"><Droplets size={29} /></span><span><strong>JalDrishti</strong><small>जलदृष्टि</small></span></Link>;
}

function GovernmentTopBar() {
  const { language, setLanguage, textScale, setTextScale } = useAppStore();
  return <div className="utility-bar"><div className="container utility-inner"><span>Government Groundwater Decision Support Platform</span><div className="utility-actions"><a href="#main-content">Skip to Main Content</a><span className="utility-separator" /><button aria-label="Decrease text size" onClick={() => setTextScale(Math.max(.9, textScale - .1))}>A−</button><button aria-label="Default text size" onClick={() => setTextScale(1)}>A</button><button aria-label="Increase text size" onClick={() => setTextScale(Math.min(1.2, textScale + .1))}>A+</button><span className="utility-separator" /><label className="sr-only" htmlFor="language-select">Language</label><select id="language-select" value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>हिंदी</option><option>मराठी</option></select><Link to="/help"><HelpCircle size={14} /> Help</Link></div></div></div>;
}

function MainHeader({ onMenu }) {
  const navigate = useNavigate();
  const { user } = useAppStore();
  return <header className="main-header"><div className="container header-inner"><Logo /><div className="portal-title"><span>Real-Time Groundwater Resource Evaluation</span><small>Monitoring • Forecasting • Early Warning</small></div><div className="header-actions"><button className="icon-button" aria-label="Open search" onClick={() => navigate('/stations')}><Search /></button><Link className="button button-outline login-button" to={user ? '/profile' : '/login'}><LogIn size={17} />{user ? 'Profile' : 'Login'}</Link><button className="menu-button" aria-label="Open navigation" onClick={onMenu}><Menu /></button></div></div></header>;
}

function Navigation({ mobileOpen, setMobileOpen }) {
  const { role, setRole } = useAppStore();
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname, setMobileOpen]);
  return <><nav className="main-nav" aria-label="Primary navigation"><div className="container nav-inner">{navItems.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>)}</div></nav><div className={`mobile-nav-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)}><nav className="mobile-nav" aria-label="Mobile navigation" onClick={(event) => event.stopPropagation()}><div className="mobile-nav-head"><Logo /><button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button></div>{navItems.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>)}<label htmlFor="role-switch">Demo experience</label><select id="role-switch" value={role} onChange={(event) => setRole(event.target.value)}><option value="public">Public / Farmer</option><option value="researcher">Researcher</option><option value="planner">Government Planner</option></select></nav></div></>;
}

function Footer() {
  return <footer className="footer"><div className="container footer-grid"><div><Logo /><p>Decision-ready groundwater information from monitoring stations, analytical methods, and forecasts.</p></div><div><h3>Explore</h3><Link to="/data-sources">Data Sources</Link><Link to="/learn">Learn</Link><Link to="/about">About</Link></div><div><h3>Support</h3><Link to="/help">Help & Support</Link><Link to="/settings">Accessibility</Link><button onClick={() => window.alert('Privacy policy is a frontend demonstration placeholder.')}>Privacy Policy</button><button onClick={() => window.alert('Terms of use are a frontend demonstration placeholder.')}>Terms of Use</button></div><div><h3>Important links</h3><span>Central Ground Water Board</span><span>National Water Data Portal</span><span>Ministry of Jal Shakti</span><span>India-WRIS</span></div></div><div className="footer-note"><div className="container"><p>JalDrishti is a groundwater decision-support platform. Forecasts and processed values should not be treated as official regulatory declarations.</p><span>Last updated: 14 July 2026 · Version 1.0.0</span></div></div></footer>;
}

export default function PortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { textScale, setOffline } = useAppStore();
  useEffect(() => { document.documentElement.style.setProperty('--text-scale', textScale); const online = () => setOffline(false); const offline = () => setOffline(true); window.addEventListener('online', online); window.addEventListener('offline', offline); return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); }; }, [textScale, setOffline]);
  return <div className="site-shell"><a className="skip-link" href="#main-content">Skip to main content</a><GovernmentTopBar /><MainHeader onMenu={() => setMobileOpen(true)} /><Navigation mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><OfflineBanner /><main id="main-content" tabIndex="-1"><Outlet /></main><Footer /></div>;
}

export function PageHeader({ eyebrow = 'JalDrishti', title, description, children }) {
  return <section className="page-header"><div className="container"><span className="eyebrow">{eyebrow}</span><div className="page-header-row"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="page-actions">{children}</div>}</div></div></section>;
}

export function Breadcrumb({ items = [] }) {
  return <nav className="breadcrumb container" aria-label="Breadcrumb"><Link to="/">Home</Link>{items.map((item) => <span key={item}><ChevronDown size={13} />{item}</span>)}</nav>;
}
