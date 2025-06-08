
import mongoose, { Schema, Document } from "mongoose";

export interface ISessionPackage extends Document {
  userId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  type: "chat" | "audio" | "video";
  totalSessions: number;
  remainingSessions: number;
  price: number;
  status: "active" | "expired";
}

const SessionPackageSchema: Schema<ISessionPackage> = new Schema(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: "Mentor", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    type: { type: String, enum: ["chat", "audio", "video"], required: true },
    totalSessions: { type: Number, required: true },
    remainingSessions: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ["active", "expired"], default: "active" },
  },
  { timestamps: true }
);

export const SessionPackage = mongoose.model<ISessionPackage>(
  "SessionPackage",
  SessionPackageSchema
);
