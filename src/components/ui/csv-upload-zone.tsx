'use client';

import { useRef, useState, useCallback } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CSVUploadZoneProps {
    /** Show as full-page hero or compact inline */
    variant?: 'hero' | 'compact';
}

export function CSVUploadZone({ variant = 'hero' }: CSVUploadZoneProps) {
    const { uploadFile, isLoading } = useDataStore();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
            toast.error('Invalid file type', { description: 'Please upload a .csv or .xlsx file.' });
            return;
        }

        setUploadStatus('processing');
        try {
            const summary = await uploadFile(file);
            setUploadStatus('success');
            toast.success('Dataset Processed Successfully', {
                description: `${summary.total_records} records processed\n${summary.validation_flags} validation flags\n${summary.inefficient_shipments} inefficiencies detected\n${summary.optimization_candidates} optimization candidates`,
                duration: 8000,
            });
        } catch (err: any) {
            setUploadStatus('error');
            toast.error('Processing Failed', {
                description: err.message || 'Make sure the Python backend is running on port 8000.',
            });
        }
    }, [uploadFile]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);

    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileChange} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    {isLoading ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing...</>
                    ) : (
                        <><Upload className="w-3.5 h-3.5 mr-1.5" /> Upload CSV</>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center min-h-[60vh]"
        >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileChange} />

            <motion.div
                className={`
          w-full max-w-lg border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300 ease-out
          ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-primary/[0.02]'}
          ${uploadStatus === 'processing' ? 'pointer-events-none opacity-80' : ''}
        `}
                onClick={() => uploadStatus !== 'processing' && fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                whileHover={{ scale: uploadStatus === 'processing' ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                {uploadStatus === 'processing' ? (
                    <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                            <Loader2 className="w-16 h-16 text-primary" />
                        </motion.div>
                        <div>
                            <p className="text-lg font-bold text-foreground">Processing your data...</p>
                            <p className="text-sm text-muted-foreground mt-1">Running Python pipeline: cleaning → validation → CO₂ calculation → optimization</p>
                        </div>
                    </motion.div>
                ) : uploadStatus === 'success' ? (
                    <motion.div className="flex flex-col items-center gap-4" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
                        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                        <div>
                            <p className="text-lg font-bold text-foreground">Data Loaded Successfully!</p>
                            <p className="text-sm text-muted-foreground mt-1">Navigate to any page to explore your processed data.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setUploadStatus('idle'); }}>
                            Upload Another Dataset
                        </Button>
                    </motion.div>
                ) : uploadStatus === 'error' ? (
                    <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <AlertCircle className="w-16 h-16 text-red-500" />
                        <div>
                            <p className="text-lg font-bold text-foreground">Processing Failed</p>
                            <p className="text-sm text-muted-foreground mt-1">Check that the Python backend is running on port 8000.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setUploadStatus('idle'); }}>
                            Try Again
                        </Button>
                    </motion.div>
                ) : (
                    <>
                        <motion.div
                            className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <FileSpreadsheet className="w-10 h-10 text-primary" />
                        </motion.div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Upload Your Shipment Dataset</h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            Drag & drop a <strong>.csv</strong> or <strong>.xlsx</strong> file here, or click to browse.
                        </p>
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8">
                            <Upload className="w-4 h-4 mr-2" /> Select File
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">
                            The file will be processed by the Python backend: data cleaning → emission factor lookup → CO₂ calculation → validation → inefficiency detection → optimization suggestions.
                        </p>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}
