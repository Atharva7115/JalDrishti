import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
export default function NotFoundPage(){return <main className="not-found"><MapPin/><span>404</span><h1>Page not found</h1><p>The requested JalDrishti page does not exist or may have moved.</p><Link className="button" to="/">Return to homepage</Link></main>}
