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
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-semibold text-emerald-200">Archive safely extracted & analyzed</h4>
              <p className="text-emerald-300/80 text-xs mt-1">
                {uploadResult.project.name} is now available in My Projects.
              </p>
            </div>
          </div>

          {/* Analysis details */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
              <Sparkles className="w-4 h-4" /> Static Project Detection Results
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Project Type:</span>
                <span className="font-medium text-white">{uploadResult.analysis?.detectedType}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Framework:</span>
                <span className="font-medium text-white">{uploadResult.analysis?.framework}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Build Command:</span>
                <span className="font-mono text-emerald-400">
                  {uploadResult.analysis?.buildCommand || 'None required'}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Output Directory:</span>
                <span className="font-mono text-slate-200">{uploadResult.analysis?.outputDirectory}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleClose}
              className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-200 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
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
                ? 'border-blue-500 bg-blue-950/20'
                : selectedFile
                ? 'border-emerald-500/50 bg-emerald-950/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'
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
                <FileArchive className="w-10 h-10 mx-auto text-emerald-400" />
                <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 pt-1"
                >
                  <X className="w-3 h-3" /> Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-10 h-10 mx-auto text-slate-500" />
                <p className="text-sm font-medium text-slate-200">
                  Drag & drop your static site ZIP here, or <span className="text-blue-400">browse</span>
                </p>
                <p className="text-xs text-slate-500">
                  Supports Vite, React, Pure HTML/CSS/JS, Astro, and static builds up to 50MB
                </p>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-static-website"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Description (Optional)</label>
              <input
                type="text"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Landing page or portfolio static website"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading and scanning archive...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload & Inspect'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default UploadZipModal;
