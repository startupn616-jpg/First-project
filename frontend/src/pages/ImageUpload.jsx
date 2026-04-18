import React, { useState, useRef, useCallback } from 'react';
import Header from '../components/Header';
import { uploadImage, fetchAnalyses } from '../services/api';

const CONFIDENCE_COLOR = (c) => {
  if (c >= 90) return 'text-green-700 bg-green-50';
  if (c >= 75) return 'text-yellow-700 bg-yellow-50';
  return 'text-red-700 bg-red-50';
};

export default function ImageUpload() {
  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [progress, setProgress]       = useState(0);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState('');
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

    // Generate image preview
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-800">📤 Upload &amp; AI Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload a field photo to detect the crop type, land condition, and get recommendations.
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

            {/* Drop zone */}
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

            {/* Progress bar */}
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

            {/* Guidance */}
            <div className="mt-4 p-3 bg-earth-100 rounded-lg text-xs text-earth-700 border border-earth-200">
              <p className="font-semibold mb-1">📷 Tips for better results:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Take photo in good daylight</li>
                <li>Include the crop canopy and soil</li>
                <li>Avoid blurry or night images</li>
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
              <div className="gov-card fade-in">
                <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
                  🤖 AI Analysis Result
                </h2>

                {/* Crop type - hero */}
                <div className="bg-gov-700 rounded-xl p-4 text-white mb-4">
                  <div className="text-xs text-gov-200 mb-0.5">Detected Crop</div>
                  <div className="text-xl font-bold">{result.cropType}</div>
                  <div className="text-gov-200 text-xs mt-1">🗓️ Season: {result.growthSeason}</div>
                </div>

                {/* Confidence */}
                <div className={`flex items-center justify-between p-3 rounded-lg text-sm font-semibold mb-3 ${CONFIDENCE_COLOR(result.confidence)}`}>
                  <span>AI Confidence</span>
                  <span className="text-lg font-black">{result.confidence}%</span>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { icon: '🌾', label: 'Land Condition', value: result.landCondition },
                    { icon: '🌍', label: 'Soil Quality',   value: result.soilQuality },
                    { icon: '💧', label: 'Irrigation',     value: result.irrigationStatus },
                    { icon: '📊', label: 'Est. Yield',     value: result.estimatedYield },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="text-lg mb-0.5">{icon}</div>
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="text-xs font-semibold text-gray-800 leading-snug mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Detected features */}
                {result.detectedFeatures?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">Detected Features</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.detectedFeatures.map((f) => (
                        <span key={f} className="badge-blue">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">📋 Recommendations</p>
                  <ul className="space-y-1.5">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded p-2">
                        <span className="text-gov-600 font-bold mt-0.5">→</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-gray-400 mt-3 italic border-t pt-2">
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
