// src/pages/operator/Start.tsx
import { useEffect, useRef, useState } from "react";
import client from "../../api/axiosClient";
import { addOutbox } from "../../utils/idb";
import AudioRecorder from "../../components/AudioRecorder";
import { v4 as uuidv4 } from "uuid";

// Real JSW Steel machines and categories
const machines = [
  "Hot Strip Mill",
  "Cold Rolling Mill",
  "Blast Furnace",
  "Basic Oxygen Furnace",
  "Continuous Casting Machine",
  "Plate Mill",
  "Wire Rod Mill",
  "Galvanizing Line",
  "Pickling Line",
  "Sinter Plant"
];

const reasons = [
  "Mechanical Failure",
  "Electrical Failure",
  "Quality Issue",
  "Raw Material Issue",
  "Safety Issue",
  "Other"
];

const categories = {
  "Mechanical Failure": ["Bearing Failure", "Jam", "Broken Shaft", "Hydraulic Leak", "Coupling Issue"],
  "Electrical Failure": ["Motor Failure", "Sensor Malfunction", "Wiring Issue", "PLC Error", "Drive Failure"],
  "Quality Issue": ["Dimension Out of Spec", "Surface Defect", "Thickness Variation", "Hardness Issue"],
  "Raw Material Issue": ["Impurity", "Size Mismatch", "Chemical Composition", "Temperature Issue"],
  "Safety Issue": ["Guard Removed", "Unsafe Act", "PPE Violation", "Emergency Stop"],
  "Other": ["Miscellaneous", "Scheduled Maintenance", "Operator Error"]
};

export default function OperatorStart() {
  const [machine, setMachine] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataBase64, setImageDataBase64] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!machine && machines.length) setMachine(machines[0]);
  }, []);

  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageDataBase64(result);
    };
    reader.readAsDataURL(file);
  }

  function handleCaptureClick() {
    fileInputRef.current?.click();
  }

  // ---- ONLINE (MULTIPART) SUBMIT ----
  async function submitOnline(payload: any) {
    const form = new FormData();
    form.append("machine_id", payload.machine_id);

    // FIX: use backend field names
    form.append("reason", payload.root_cause);
    form.append("category", payload.sub_category);

    form.append("description", payload.description);

    if (payload.image_file) form.append("image", payload.image_file);
    if (payload.audio_file) form.append("audio", payload.audio_file);

    return client.post("/api/operator/log", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  // ---- FINAL SUBMIT HANDLER ----
  async function submit(payload: any) {
    const online = navigator.onLine;

    if (online) {
      try {
        if (payload.image_file || payload.audio_file) {
          await submitOnline(payload);
          alert("Submitted online");
          return;
        }

        // FIX: JSON submit also uses correct fields
        await client.post("/api/operator/log", {
          machine_id: payload.machine_id,
          reason: payload.root_cause,
          category: payload.sub_category,
          description: payload.description,
          image_base64: payload.image_base64 || null,
          audio_base64: payload.audio_base64 || null,
        });

        alert("Submitted online (JSON)");
        return;
      } catch (err) {
        console.warn("Online submit failed, queueing offline", err);
      }
    }

    // ---- OFFLINE QUEUE ----
    const id = uuidv4();
    const queued = {
      id,
      created_at: new Date().toISOString(),
      machine_id: payload.machine_id,

      // FIX: match backend fields
      reason: payload.root_cause,
      category: payload.sub_category,

      description: payload.description,
      image_base64: payload.image_base64 || null,
      audio_base64: payload.audio_base64 || null,
    };

    await addOutbox(queued);

    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const reg = await navigator.serviceWorker.ready;
      try {
        await reg.sync.register("qd-sync");
      } catch (_) {}
    }

    alert("Saved offline — will sync automatically when online.");
  }

  function onAudioSave(blob: Blob) {
    setAudioBlob(blob);
  }

  async function onSubmit(e: any) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload: any = {
        machine_id: machine,
        root_cause: reason,
        sub_category: category,
        description,
      };

      if (imageDataBase64) payload.image_base64 = imageDataBase64;

      if (audioBlob) {
        const base64 = await blobToBase64(audioBlob);
        payload.audio_base64 = base64;
        payload.audio_file = audioBlob;
      }

      await submit(payload);

      setDescription("");
      setImagePreview(null);
      setImageDataBase64(null);
      setAudioBlob(null);
      setReason("");
      setCategory("");
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleImageFile(f);
  }

  function blobToBase64(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1322] to-[#0f1a2e]">
      
      {/* Header */}
      <div className="bg-[#07121a] border-b border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Operator Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">JSW Steel - Downtime Logging System</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Status</div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-3 h-3 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <span className="text-white font-medium">{navigator.onLine ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#07121a] border border-gray-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/20 p-2.5 rounded-lg">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-gray-400 text-xs sm:text-sm">Total Machines</div>
                <div className="text-white text-xl sm:text-2xl font-bold">{machines.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-[#07121a] border border-gray-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-green-600/20 p-2.5 rounded-lg">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-gray-400 text-xs sm:text-sm">Shift</div>
                <div className="text-white text-xl sm:text-2xl font-bold">Day</div>
              </div>
            </div>
          </div>

          <div className="bg-[#07121a] border border-gray-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600/20 p-2.5 rounded-lg">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-gray-400 text-xs sm:text-sm">Time</div>
                <div className="text-white text-xl sm:text-2xl font-bold">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#07121a] border border-gray-800 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6 border-b border-gray-800">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Log Machine Downtime
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Record and report machine failures or issues</p>
          </div>

          <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            
            {/* Machine Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Machine / Equipment *
              </label>
              <select
                value={machine}
                onChange={e => setMachine(e.target.value)}
                required
                className="w-full p-3 bg-[#0f1724] text-white border border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              >
                {machines.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Reason & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Root Cause / Reason *
                </label>
                <select
                  value={reason}
                  onChange={e => { setReason(e.target.value); setCategory(""); }}
                  required
                  className="w-full p-3 bg-[#0f1724] text-white border border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                >
                  <option value="">Select reason</option>
                  {reasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sub-Category *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  required
                  disabled={!reason}
                  className="w-full p-3 bg-[#0f1724] text-white border border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select category</option>
                  {(categories[reason] || []).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description / Details
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full p-3 bg-[#0f1724] text-white border border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-gray-500 resize-none"
                rows={4}
              />
            </div>

            {/* Media Attachments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Photo Upload */}
              <div className="bg-[#0f1724] border border-gray-700 rounded-xl p-5">
                <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Photo Evidence
                </label>
                <button
                  type="button"
                  onClick={handleCaptureClick}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Take / Choose Photo
                </button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full h-40 object-cover rounded-lg border-2 border-green-500/50"
                    />
                    <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Photo attached
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Note */}
              <div className="bg-[#0f1724] border border-gray-700 rounded-xl p-5">
                <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Voice Note
                </label>
                <AudioRecorder onSave={onAudioSave} />
                {audioBlob && (
                  <div className="mt-3 text-sm text-green-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Recording attached
                  </div>
                )}
              </div>

            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-4 pt-4">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold text-lg shadow-lg shadow-green-600/20 hover:shadow-xl hover:shadow-green-600/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Report
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}