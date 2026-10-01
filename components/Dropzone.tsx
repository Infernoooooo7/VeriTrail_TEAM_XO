'use client';
import { useRef, useState } from 'react';
import { FileUp, LoaderCircle } from 'lucide-react';

export function Dropzone({ onFile, busy = false }: { onFile: (file: File) => void; busy?: boolean }) {
  const input = useRef<HTMLInputElement>(null); const [dragging, setDragging] = useState(false);
  return <div onClick={() => input.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) onFile(file); }} className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition ${dragging ? 'border-coral bg-coral/5' : 'border-ink/15 bg-white/60 hover:border-ink/30 hover:bg-white'}`}>
    <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} /><span className="mb-4 grid size-12 place-items-center rounded-2xl bg-paper text-coral">{busy ? <LoaderCircle className="animate-spin" size={22} /> : <FileUp size={22} />}</span><strong className="text-sm">Drop a PDF here</strong><span className="mt-1 text-xs text-ink/45">or click to browse · max 25 MB</span>
  </div>;
}