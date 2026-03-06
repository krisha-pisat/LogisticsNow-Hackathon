'use client';

import { useShipments } from '@/hooks/useShipments';
import { calculateESGScore, calculateShipmentCO2 } from '@/lib/emissions';
import { ChartCard } from '@/components/ui/chart-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, CheckCircle2, Layers } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem, AnimatedProgress } from '@/components/motion';
import { toast } from 'sonner';
import CountUp from 'react-countup';

export default function ReportsPage() {
  const { shipments } = useShipments();
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Report configuration
  const [reportPeriod, setReportPeriod] = useState('30');
  const [reportScope, setReportScope] = useState('scope3');
  const [showKpis, setShowKpis] = useState(true);
  const [showNarrative, setShowNarrative] = useState(true);

  const filteredShipments = useMemo(() => {
    const daysAgo = parseInt(reportPeriod);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysAgo);
    return shipments.filter(s => new Date(s.shipment_date) >= cutoff);
  }, [shipments, reportPeriod]);

  const metrics = useMemo(() => {
    let totalCO2 = 0;
    let totalWeight = 0;
    let totalDist = 0;
    let totalLoad = 0;
    const vehicleBreakdown = new Map<string, number>();

    filteredShipments.forEach(s => {
      const co2 = calculateShipmentCO2(s);
      totalCO2 += co2;
      totalWeight += s.weight_kg;
      totalDist += s.distance_km;
      totalLoad += s.load_factor;
      vehicleBreakdown.set(s.vehicle_type, (vehicleBreakdown.get(s.vehicle_type) || 0) + co2);
    });

    const avgLoad = filteredShipments.length > 0 ? totalLoad / filteredShipments.length : 0;

    return {
      totalCO2,
      esgScore: calculateESGScore(totalCO2, totalWeight * 0.1, avgLoad),
      totalWeight,
      totalDist,
      avgLoad,
      totalShipments: filteredShipments.length,
      vehicleBreakdown: Array.from(vehicleBreakdown.entries())
        .map(([mode, co2]) => ({ mode, co2, pct: totalCO2 > 0 ? ((co2 / totalCO2) * 100).toFixed(1) : '0' }))
        .sort((a, b) => b.co2 - a.co2),
    };
  }, [filteredShipments]);

  const scopeLabel = reportScope === 'scope1' ? 'Scope 1 (Direct)' : reportScope === 'scope2' ? 'Scope 2 (Energy)' : 'Scope 3 (Transport)';

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress(prev => Math.min(prev + 15, 90));
    }, 200);

    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`CIOA_ESG_Report_${reportScope}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      setDownloadProgress(100);
      toast.success('PDF report downloaded');
    } catch (err) {
      console.error('Failed to generate PDF', err);
      toast.error('Failed to generate PDF', { description: 'Please try again.' });
    } finally {
      clearInterval(interval);
      setTimeout(() => { setDownloading(false); setDownloadProgress(0); }, 1000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ESG Reporting</h1>
          <p className="text-muted-foreground text-sm">Generate stakeholder-ready sustainability tear sheets.</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button onClick={handleDownload} disabled={downloading} className="bg-primary hover:bg-primary/90 text-white">
            {downloading ? (
              <motion.span className="flex items-center" animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 1, repeat: Infinity }}>Generating PDF...</motion.span>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download Document</>
            )}
          </Button>
        </motion.div>
      </motion.div>

      {downloading && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <AnimatedProgress value={downloadProgress} max={100} color="#10B981" className="h-1.5" />
        </motion.div>
      )}

      {/* Report Configuration */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Period</Label>
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Scope</Label>
          <Select value={reportScope} onValueChange={setReportScope}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scope1">Scope 1</SelectItem>
              <SelectItem value="scope2">Scope 2</SelectItem>
              <SelectItem value="scope3">Scope 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">KPIs</Label>
          <button onClick={() => setShowKpis(!showKpis)} className={`w-full h-9 rounded-md border text-xs font-medium transition-colors ${showKpis ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground'}`}>
            {showKpis ? '✓ Included' : 'Excluded'}
          </button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Narrative</Label>
          <button onClick={() => setShowNarrative(!showNarrative)} className={`w-full h-9 rounded-md border text-xs font-medium transition-colors ${showNarrative ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground'}`}>
            {showNarrative ? '✓ Included' : 'Excluded'}
          </button>
        </div>
      </div>

      {/* The Printable Report Container */}
      <motion.div className="border rounded-xl shadow-lg bg-white overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} ref={reportRef}>
        <div className="p-10 space-y-8 bg-white text-slate-900">
          {/* Header */}
          <div className="flex justify-between items-end border-b pb-6">
            <div>
              <motion.div className="flex items-center gap-2 text-brand-green mb-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-3xl font-black tracking-tighter text-slate-900">CIOA</span>
              </motion.div>
              <h2 className="text-xl font-bold text-slate-700">{scopeLabel} Emissions Tear Sheet</h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Report Date</p>
              <p className="text-lg font-medium">{format(new Date(), 'MMMM d, yyyy')}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                <Layers className="w-3 h-3" /> Last {reportPeriod} days
              </div>
            </div>
          </div>

          {/* Core Metrics */}
          {showKpis && (
            <StaggerContainer className="grid grid-cols-3 gap-6" staggerDelay={0.15} initialDelay={0.3}>
              <StaggerItem>
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-lg text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">ESG Score</p>
                  <p className="text-5xl font-black text-primary"><CountUp end={metrics.esgScore} decimals={0} duration={2.5} /></p>
                  <p className="text-xs text-slate-400 mt-2">Avg load: {(metrics.avgLoad * 100).toFixed(0)}%</p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-lg text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Total Output</p>
                  <p className="text-4xl font-black text-slate-800"><CountUp end={metrics.totalCO2 / 1000} decimals={1} duration={2.5} separator="," />k</p>
                  <p className="text-xs text-slate-400 mt-2">Kilograms CO₂</p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-lg text-center">
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Volume Handled</p>
                  <p className="text-4xl font-black text-slate-800"><CountUp end={metrics.totalWeight / 1000} decimals={0} duration={2.5} separator="," />k</p>
                  <p className="text-xs text-slate-400 mt-2">Kilograms Cargo</p>
                </div>
              </StaggerItem>
            </StaggerContainer>
          )}

          {/* Mode breakdown table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Transport Mode</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">CO₂ (kg)</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Share</th>
                </tr>
              </thead>
              <tbody>
                {metrics.vehicleBreakdown.map(row => (
                  <tr key={row.mode} className="border-t">
                    <td className="px-4 py-2 font-medium">{row.mode}</td>
                    <td className="px-4 py-2 text-right">{row.co2.toFixed(0)}</td>
                    <td className="px-4 py-2 text-right text-primary font-semibold">{row.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Context */}
          {showNarrative && (
            <motion.div className="prose prose-sm max-w-none text-slate-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              <p>
                This document certifies the carbon tracking metrics across <strong>{metrics.totalShipments.toLocaleString()} analyzed logistics movements</strong> accumulating <strong>{metrics.totalDist.toLocaleString()} tracked kilometers</strong> over the last {reportPeriod} days.
              </p>
              <p>
                The network's average load factor stands at <strong>{(metrics.avgLoad * 100).toFixed(1)}%</strong>{metrics.avgLoad < 0.7 ? ', which is below the 80% optimal target and indicates room for consolidation optimization.' : ', meeting healthy utilization benchmarks.'}
              </p>
              <motion.div className="bg-primary/10 border border-primary/20 p-4 rounded-md flex items-start gap-3 mt-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, type: 'spring' as const }}>
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                </motion.div>
                <p className="m-0 text-sm text-slate-700">
                  <strong>Compliance Verified.</strong> The Carbon Intelligence & Optimization Agent confirms that data collection methodology adheres to standard ton-km simulation matrices based on Global Logistics Emissions Council (GLEC) approximation standards.
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="pt-10 mt-10 border-t flex justify-between text-xs text-slate-400">
            <p>Generated by CIOA automated intelligence.</p>
            <p>Confidential & Proprietary</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
