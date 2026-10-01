'use client';
import { useRef, useState } from 'react';
import { FileCheck2, FileUp, Fingerprint, LoaderCircle, ShieldCheck } from 'lucide-react';
import { isBlockedFileName } from '@/lib/file-policy';

export function Dropzone({ onFile, busy = false, onError }: { onFile: (file: File) => void; busy?: boolean; onError?: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null); const [dragging, setDragging] = useState(false);
  const acceptFile = (file?: File) => { if (!file) return; if (isBlockedFileName(file.name)) { onError?.('Executable and program files are not supported.'); return; } onFile(file); };
  return <div onClick={() => input.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); }} className={`animate-rise animate-rise-delay-1 overflow-hidden rounded-2xl border transition ${dragging ? 'border-coral bg-coral/5 shadow-lg shadow-coral/10' : 'border-ink/10 bg-white/75 hover:border-ink/25 hover:shadow-lg hover:shadow-ink/5'}`}>
    <input ref={input} type="file" accept="*/*" className="hidden" onChange={(event) => acceptFile(event.target.files?.[0])} />
    <div className="flex min-h-48 cursor-pointer flex-col items-center justify-center border-b border-dashed border-ink/10 px-8 py-8 text-center">
      <span className="animate-float mb-4 grid size-14 place-items-center rounded-2xl bg-paper text-coral">{busy ? <LoaderCircle className="animate-spin" size={23} /> : <FileUp size={23} />}</span>
      <strong className="text-sm">Drop a document to begin</strong>
      <span className="mt-1.5 text-xs text-ink/45">or click to browse · any safe file · max 25 MB</span>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-mint/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.12em] text-mint-ink"><ShieldCheck size={12} /> Private ingest</span>
    </div>
    <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3"><span className="flex items-center gap-2 text-[10px] text-ink/45"><Fingerprint size={13} className="text-coral" /> SHA-256 fingerprint</span><span className="flex items-center gap-2 text-[10px] text-ink/45"><FileCheck2 size={13} className="text-mint-ink" /> Manifest check</span><span className="col-span-2 flex items-center gap-2 text-[10px] text-ink/45 sm:col-span-1"><ShieldCheck size={13} className="text-ink/45" /> No executables</span></div>
  </div>;
}