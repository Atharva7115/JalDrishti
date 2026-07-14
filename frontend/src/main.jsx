import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import './localization/i18n';
import './styles/global.css';

const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:5*60*1000,retry:1,refetchOnWindowFocus:false}}});
createRoot(document.getElementById('root')).render(<StrictMode><QueryClientProvider client={queryClient}><App/><Toaster position="top-right" richColors closeButton/></QueryClientProvider></StrictMode>);
