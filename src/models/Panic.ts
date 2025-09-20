import mongoose, { Schema, Document } from 'mongoose';

export interface IPanic extends Document {
  touristId: mongoose.Types.ObjectId;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  reportedBy: mongoose.Types.ObjectId;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'investigating';
  respondedBy?: mongoose.Types.ObjectId;
  responseTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PanicSchema = new Schema<IPanic>({
  touristId: {
    type: Schema.Types.ObjectId,
    ref: 'Tourist',
    required: true
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'investigating'],
    default: 'active'
  },
  respondedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  responseTime: Date,
  notes: String
}, {
  timestamps: true
});

// Indexes for better query performance
PanicSchema.index({ touristId: 1, timestamp: -1 });
PanicSchema.index({ status: 1, priority: 1 });
PanicSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

export default mongoose.model<IPanic>('Panic', PanicSchema);