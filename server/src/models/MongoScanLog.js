import mongoose from 'mongoose';

const ProjectScanLogSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['github', 'zip'],
      required: true,
    },
    detectedType: {
      type: String,
      required: true,
    },
    framework: String,
    rawPackageJson: mongoose.Schema.Types.Mixed,
    fileTree: [String],
    heuristics: mongoose.Schema.Types.Mixed,
    scanDurationMs: Number,
  },
  {
    timestamps: true,
  }
);

export const ProjectScanLog = mongoose.models.ProjectScanLog || mongoose.model('ProjectScanLog', ProjectScanLogSchema);
export default ProjectScanLog;
