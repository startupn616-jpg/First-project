import React, { useState, useRef, useCallback } from 'react';
import Header from '../components/Header';
import { uploadImage } from '../services/api';

const RATING_STYLE = {
  Excellent: 'text-green-700 bg-green-50 border-green-200',
  Good:      'text-blue-700 bg-blue-50 border-blue-200',
  Fair:      'text-yellow-700 bg-yellow-50 border-yellow-200',
  Poor:      'text-orange-700 bg-orange-50 border-orange-200',
  Critical:  'text-red-700 bg-red-50 border-red-200',
};

const CONFIDENCE_COLOR = (c) => {
  if (c >= 85) return 'text-green-700 bg-green-50';
  if (c >= 65) return 'text-yellow-700 bg-yellow-50';
  return 'text-red-700 bg-red-50';
};

export default function ImageUpload() {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(selectedFile.type)) {
      setError('Only JPG, PNG, and WebP images are accepted.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.');
      return;
    }

    setError('');
    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await uploadImage(formData, setProgress);
      setResult(res.data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreview(null);
    setResult(null); setError('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const detectedTags = result
    ? [
        ...(result.diseasesDetected   || []),
        ...(result.pestsDetected      || []),
        ...(result.structuresDetected || []),
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-800">📤 Upload &amp; AI Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload a field photo to detect crop type, land condition, and get actionable recommendations.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 fade-in">
            ⚠️ {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* Upload panel */}
          <div className="gov-card">
            <h2 className="font-semibold text-gray-700 text-sm mb-3">Select Image</h2>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                ${dragOver ? 'border-gov-500 bg-gov-50' : 'border-gray-300 hover:border-gov-400 hover:bg-gray-50'}`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg object-contain mb-2"
                />
              ) : (
                <>
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="font-medium text-gray-600 text-sm">Drop image here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 10 MB</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {file && (
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2">
                📎 {file.name} &nbsp;|&nbsp; {(file.size / 1024).toFixed(0)} KB
              </div>
            )}

            {uploading && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading &amp; analyzing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gov-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAnalyze}
                disabled={!file || uploading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin" /> Analyzing...</>
                ) : '🤖 Analyze with AI'}
              </button>
              {(file || result) && (
                <button onClick={reset} className="btn-secondary px-3">Reset</button>
              )}
            </div>

            <div className="mt-4 p-3 bg-earth-100 rounded-lg text-xs text-earth-700 border border-earth-200">
              <p className="font-semibold mb-1">📷 Tips for better results:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Take photo in good daylight</li>
                <li>Include the crop canopy and soil</li>
                <li>Avoid blurry or night images</li>
                <li>Aerial/drone shots work best</li>
              </ul>
            </div>
          </div>

          {/* AI Result panel */}
          <div>
            {!result && !uploading && (
              <div className="gov-card h-full flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <div className="text-5xl mb-3">🤖</div>
                <p className="font-medium text-gray-500">AI Analysis Results</p>
                <p className="text-sm mt-1">Upload and analyze an image to see results here.</p>
              </div>
            )}

            {uploading && (
              <div className="gov-card h-full flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-3 animate-pulse">🧠</div>
                <p className="font-medium text-gov-700">AI is analyzing your image...</p>
                <p className="text-sm text-gray-500 mt-1">Detecting crop type and land condition</p>
              </div>
            )}

            {result && (
              <div className="gov-card fade-in space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                    🤖 AI Analysis Result
                  </h2>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    Llama Vision AI
                  </span>
                </div>

                {/* Crop identified */}
                <div className="bg-gov-700 rounded-xl p-4 text-white">
                  <div className="text-xs text-gov-200 mb-0.5">Detected Crop</div>
                  <div className="text-xl font-bold">
                    {result.cropIdentified || 'No crop detected'}
                  </div>
                  {result.cropIdentified_ta && (
                    <div className="text-gov-200 text-sm mt-0.5">{result.cropIdentified_ta}</div>
                  )}
                  <div className="text-gov-300 text-xs mt-1.5">
                    🌱 Stage: {result.growthStage || '—'}
                  </div>
                </div>

                {/* Confidence + Overall rating */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex flex-col items-center p-3 rounded-lg text-sm font-semibold ${CONFIDENCE_COLOR(result.cropConfidence)}`}>
                    <span className="text-xs font-normal mb-0.5">AI Confidence</span>
                    <span className="text-2xl font-black">{result.cropConfidence ?? 0}%</span>
                  </div>
                  <div className={`flex flex-col items-center p-3 rounded-lg text-sm font-semibold border ${RATING_STYLE[result.overallRating] || 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                    <span className="text-xs font-normal mb-0.5">Overall Rating</span>
                    <span className="text-base font-black">{result.overallRating || '—'}</span>
                  </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: '🌾', label: 'Land Condition', value: result.healthStatus },
                    { icon: '🌍', label: 'Soil Condition', value: result.soilCondition },
                    { icon: '💧', label: 'Irrigation',     value: result.irrigationStatus },
                    { icon: '📊', label: 'Est. Yield',     value: result.estimatedYield || '—' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="text-lg mb-0.5">{icon}</div>
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="text-xs font-semibold text-gray-800 leading-snug mt-0.5">{value || '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Health status in Tamil */}
                {result.healthStatus_ta && (
                  <div className="bg-gov-50 border border-gov-200 rounded-lg p-2.5 text-xs text-gov-800">
                    <span className="font-semibold">நிலை: </span>{result.healthStatus_ta}
                  </div>
                )}

                {/* Key observations */}
                {result.keyObservations?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">🔍 Key Observations</p>
                    <ul className="space-y-1">
                      {result.keyObservations.map((obs, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded p-2">
                          <span className="text-gov-500 font-bold mt-0.5">•</span>
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Diseases + Pests */}
                {detectedTags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">⚠️ Detected Issues</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedTags.map((tag) => (
                        <span key={tag} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Immediate actions */}
                {result.immediateActions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">📋 Immediate Actions</p>
                    <ul className="space-y-1.5">
                      {result.immediateActions.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded p-2">
                          <span className="text-gov-600 font-bold mt-0.5">→</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Immediate actions in Tamil */}
                {result.immediateActions_ta?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gov-700 mb-1.5">📋 உடனடி நடவடிக்கைகள்</p>
                    <ul className="space-y-1">
                      {result.immediateActions_ta.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gov-800 bg-gov-50 rounded p-2">
                          <span className="text-gov-500 font-bold mt-0.5">→</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preventive measures */}
                {result.preventiveMeasures?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">🛡️ Preventive Measures</p>
                    <ul className="space-y-1">
                      {result.preventiveMeasures.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 rounded p-2">
                          <span className="text-blue-500 font-bold mt-0.5">✓</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Additional notes */}
                {result.additionalNotes && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                    📝 {result.additionalNotes}
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-xs text-gray-400 italic border-t pt-2">
                  {result.note}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
