import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Filter, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb, PageHeader } from '../components/layout/PortalLayout';
import { AlertCard, DemoBadge, EmptyState, LoadingSkeleton, ErrorState } from '../components/common/UI';
import { groundwaterService } from '../services/groundwater.service';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState(''); // 'New' vs 'Acknowledged'

  const filters = {
    severity: severity || undefined,
    isResolved: status === 'Acknowledged' ? 'true' : (status === 'New' ? 'false' : undefined)
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => groundwaterService.getAlerts(filters),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id) => groundwaterService.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      toast.success('Alert marked as acknowledged.');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to acknowledge alert.');
    }
  });

  if (isLoading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={5}/></div></section>;
  if (isError) return <section className="page-section"><div className="container"><ErrorState retry={refetch}/></div></section>;

  const alertItems = data?.data || [];

  return (
    <>
      <Breadcrumb items={['Alerts']}/>
      <PageHeader title="Groundwater Alerts" description="Review automated classification changes, rapid declines, forecast warnings, and telemetry outliers.">
        <DemoBadge/>
      </PageHeader>
      
      <section className="page-section">
        <div className="container">
          <div className="filters alert-filters">
            <div className="field">
              <label htmlFor="severity">Severity</label>
              <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">All severities</option>
                {['critical', 'high', 'medium', 'low'].map((v) => (
                  <option key={v} value={v}>{v.toUpperCase()}</option>
                ))}
              </select>
            </div>
            
            <div className="field">
              <label htmlFor="alert-status">Status</label>
              <select id="alert-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="New">New / Active</option>
                <option value="Acknowledged">Acknowledged / Resolved</option>
              </select>
            </div>
            
            <button className="button" onClick={() => refetch()}><Filter size={16}/> Apply filters</button>
            <button className="button button-outline" onClick={() => { setSeverity(''); setStatus(''); }}>Reset</button>
          </div>
          
          {alertItems.length ? (
            <div className="alert-list">
              {alertItems.map((a) => (
                <AlertCard 
                  key={a.id} 
                  alert={{
                    ...a,
                    status: a.acknowledged ? 'Acknowledged' : 'New',
                    message: a.description
                  }} 
                  onStatusChange={() => acknowledgeMutation.mutate(a.id)}
                />
              ))}
            </div>
          ) : <EmptyState title="No active database alerts match these filters"/>}
        </div>
      </section>
    </>
  );
}

export function AlertDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['alert', id],
    queryFn: async () => {
      // Find alert details via API list or helper
      const res = await groundwaterService.getAlerts();
      const list = res.data || [];
      return list.find(a => a.id === id) || list[0];
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId) => groundwaterService.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      toast.success('Alert marked as acknowledged.');
      navigate('/alerts');
    }
  });

  if (isLoading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={3}/></div></section>;
  if (isError || !data) return <section className="page-section"><div className="container"><ErrorState retry={refetch}/></div></section>;

  const alert = data;
  const currentStatus = alert.acknowledged ? 'Acknowledged' : 'New';

  return (
    <>
      <Breadcrumb items={['Alerts', alert.title]}/>
      <PageHeader eyebrow={`${alert.severity} severity`} title={alert.title} description={`${alert.district || 'Maharashtra'} · Triggered ${new Date(alert.createdAt).toLocaleString('en-IN')}`}/>
      
      <section className="page-section">
        <div className="container content-grid">
          <section className="panel">
            <h2>Alert evidence</h2>
            <dl className="detail-list single">
              <div><dt>Status</dt><dd>{currentStatus}</dd></div>
              <div><dt>Trigger reason</dt><dd>{alert.description}</dd></div>
              <div><dt>Related station ID</dt><dd>{alert.stationId}</dd></div>
              <div><dt>Monitoring Station</dt><dd>{alert.stationName}</dd></div>
              <div><dt>District</dt><dd>{alert.district}</dd></div>
            </dl>
            <h3>Recommended action</h3>
            <p>Deploy localized inspection teams to check sensor telemetry and evaluate GEC stage extraction values.</p>
          </section>
          
          <aside className="panel">
            <h2>Review actions</h2>
            <div className="stacked-actions">
              {!alert.acknowledged && (
                <button className="button" onClick={() => acknowledgeMutation.mutate(alert.id)}>
                  <CheckCircle2 size={17}/> Acknowledge & Resolve
                </button>
              )}
              <button className="button button-outline" onClick={() => toast.info('Internal note saved locally.')}>
                <MessageSquare size={17}/> Add internal note
              </button>
              <button className="button button-outline" onClick={() => toast.success('Exported to local system.')}>
                <Download size={17}/> Download PDF summary
              </button>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
