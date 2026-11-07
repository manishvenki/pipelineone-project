import React, { useState, useRef } from 'react';
import { UploadCloud, FileArchive, CheckCircle2, AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import Modal from '../common/Modal';
import { uploadProjectZip } from '../../services/projectService';
import { useNotification } from '../../context/NotificationContext';

export const UploadZipModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const fileInputRef = useRef(null);
  const notify = useNotification();

  const handleFile = (file) => {
    setError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a valid ZIP archive (.zip)');
      return;
    }

    const maxSizeMb = 50;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Archive size exceeds the ${maxSizeMb}MB maximum limit.`);
      return;
    }

    setSelectedFile(file);
    if (!projectName) {
      // Auto-fill project name from archive filename
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setProjectName(baseName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase());
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please choose a ZIP file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);
      if (projectName) formData.append('name', projectName);
      if (projectDescription) formData.append('description', projectDescription);

      const res = await uploadProjectZip(formData, (percent) => {
        setUploadProgress(percent);
      });

      setUploadResult(res);
      notify.success(`Project "${res.project.name}" uploaded and analyzed!`);
      onProjectCreated && onProjectCreated(res.project);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload project ZIP archive');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setProjectName('');
    setProjectDescription('');
    setUploadProgress(0);
    setError(null);
    setUploadResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={uploadResult ? 'Project Uploaded Successfully' : 'Upload Project ZIP'}
      maxWidth="max-w-xl"
    >
      {uploadResult ? (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-semibold text-emerald-900">Archive safely extracted & analyzed</h4>
              <p className="text-emerald-700 text-xs mt-1">
                {uploadResult.project.name} is now available in My Projects.
              </p>
            </div>
          </div>

          {/* Analysis details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
              <Sparkles className="w-4 h-4" /> Static Project Detection Results
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-slate-500 block mb-0.5">Project Type:</span>
                <span className="font-medium text-slate-900">{uploadResult.analysis?.detectedType}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-slate-500 block mb-0.5">Framework:</span>
                <span className="font-medium text-slate-900">{uploadResult.analysis?.framework}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-slate-500 block mb-0.5">Build Command:</span>
                <span className="font-mono text-emerald-700 font-medium">
                  {uploadResult.analysis?.buildCommand || 'None required'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-slate-500 block mb-0.5">Output Directory:</span>
                <span className="font-mono text-slate-700">{uploadResult.analysis?.outputDirectory}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleClose}
              className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              accept=".zip"
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <FileArchive className="w-10 h-10 mx-auto text-emerald-600" />
                <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-xs text-red-600 hover:underline pt-1 inline-flex items-center gap-1 font-medium"
                >
                  <X className="w-3.5 h-3.5" /> Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-10 h-10 mx-auto text-blue-600" />
                <p className="text-sm font-medium text-slate-900">
                  Drag and drop your project ZIP file here
                </p>
                <p className="text-xs text-slate-500">
                  Or <span className="text-blue-600 font-semibold underline">browse files</span> from your computer (Max 50MB)
                </p>
                <p className="text-[11px] text-slate-400 pt-1">
                  Supports Vite, React, Astro, or static HTML/CSS archives
                </p>
              </div>
            )}
          </div>

          {/* Project Details Fields */}
          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Project Name (Optional)</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-static-site"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Description (Optional)</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Brief summary of this website project..."
                rows={2}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Uploading and scanning archive...</span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing ZIP Archive...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Upload & Analyze
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default UploadZipModal;
