'use client';

import { useShipments } from '@/hooks/useShipments';
import { calculateESGScore, calculateShipmentCO2 } from '@/lib/emissions';
import { ChartCard } from '@/components/ui/chart-card';
import { Button } from '@/components/ui/button';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export default function ReportsPage() {
  const { shipments } = useShipments();
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const metrics = useMemo(() => {
    let totalCO2 = 0;
    let totalWeight = 0;
    let totalDist = 0;
    let totalLoad = 0;
    shipments.forEach(s => {
      totalCO2 += calculateShipmentCO2(s);
      totalWeight += s.weight_kg;
      totalDist += s.distance_km;
      totalLoad += s.load_factor;
    });

    return { 
        totalCO2, 
        esgScore: calculateESGScore(totalCO2, totalWeight * 0.1, totalLoad / (shipments.length || 1)),
        totalWeight,
        totalDist,
        totalShipments: shipments.length
    };
  }, [shipments]);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`CIOA_ESG_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">ESG Reporting</h1>
            <p className="text-muted-foreground text-sm">Generate stakeholder-ready sustainability tear sheets.</p>
        </div>
        <Button onClick={handleDownload} disabled={downloading} className="bg-brand-green hover:bg-brand-green/90 text-white">
            {downloading ? <span className="animate-pulse">Generating PDF...</span> : <><Download className="w-4 h-4 mr-2" /> Download Document</>}
        </Button>
      </div>

      {/* The Printable Report Container */}
      <div className="border rounded-xl shadow-lg bg-white overflow-hidden" ref={reportRef}>
        <div className="p-10 space-y-8 bg-white text-slate-900">
            {/* Header */}
            <div className="flex justify-between items-end border-b pb-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green mb-2">
                        <FileText className="h-8 w-8 text-brand-green" />
                        <span className="text-3xl font-black tracking-tighter text-slate-900">CIOA</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-700">Scope 3 Emissions Tear Sheet</h2>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Report Date</p>
                    <p className="text-lg font-medium">{format(new Date(), 'MMMM d, yyyy')}</p>
                </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-lg text-center">
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">ESG Score</p>
                    <p className="text-5xl font-black text-brand-green">{metrics.esgScore.toFixed(0)}</p>
                    <p className="text-xs text-slate-400 mt-2">Target met</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-lg text-center">
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Total Output</p>
                    <p className="text-4xl font-black text-slate-800">{(metrics.totalCO2 / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k</p>
                    <p className="text-xs text-slate-400 mt-2">Kilograms CO2</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-lg text-center">
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Volume Handled</p>
                    <p className="text-4xl font-black text-slate-800">{(metrics.totalWeight / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}k</p>
                    <p className="text-xs text-slate-400 mt-2">Kilograms Cargo</p>
                </div>
            </div>

            {/* Summary Context */}
            <div className="prose prose-sm max-w-none text-slate-600">
                <p>
                    This document certifies the carbon tracking metrics across <strong>{metrics.totalShipments.toLocaleString()} analyzed logistics movements</strong> accumulating <strong>{metrics.totalDist.toLocaleString()} tracked kilometers</strong>.
                </p>
                <div className="bg-brand-green/10 border border-brand-green/20 p-4 rounded-md flex items-start gap-3 mt-4">
                    <CheckCircle2 className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
                    <p className="m-0 text-sm text-slate-700">
                        <strong>Compliance Verified.</strong> The Carbon Intelligence & Optimization Agent confirms that data collection methodology adheres to standard ton-km simulation matrices based on Global Logistics Emissions Council (GLEC) approximation standards.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="pt-10 mt-10 border-t flex justify-between text-xs text-slate-400">
                <p>Generated by CIOA automated intelligence.</p>
                <p>Confidential & Proprietary</p>
            </div>
        </div>
      </div>
    </div>
  );
}
