import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
        <Layers className="w-6 h-6" />
      </div>
      <h1 className="text-4xl font-extrabold text-white">404</h1>
      <p className="text-slate-400 text-sm max-w-sm">
        The requested page could not be found. Please check the URL or navigate back.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-all shadow-md"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Safety
      </Link>
    </div>
  );
};

export default NotFoundPage;

