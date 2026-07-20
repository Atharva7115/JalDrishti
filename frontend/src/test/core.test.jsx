import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { StatusBadge, StationCard } from '../components/common/UI';
import { filterStations } from '../pages/StationsPage';
import { stations } from '../data/mockData';

describe('groundwater interface',()=>{
  it('renders classification with text, not color alone',()=>{render(<StatusBadge status="critical"/>);expect(screen.getByText('Critical')).toBeInTheDocument()});
  it('renders accessible station details',()=>{render(<MemoryRouter><StationCard station={stations[0]}/></MemoryRouter>);expect(screen.getByText(stations[0].name)).toBeInTheDocument();expect(screen.getByRole('link',{name:/view station details/i})).toBeInTheDocument()});
  it('filters by state and classification',()=>{const result=filterStations(stations,{search:'',state:'Maharashtra',district:'',classification:'safe',status:'',trend:''});expect(result.length).toBeGreaterThan(0);expect(result.every(item=>item.state==='Maharashtra'&&item.classification==='safe')).toBe(true)});
});
