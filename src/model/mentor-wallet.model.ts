import mongoose from "mongoose";
import { IMentorWallet } from "interface/mentor-wallet.interface";

const MentorWalletSchema = new mongoose.Schema<IMentorWallet>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CallSchedule",
      required: false,
    },
    amount: {
      type: mongoose.Schema.Types.Number,
      required: true,
    },
    mentorShare: {
      type: mongoose.Schema.Types.Number,
      required: true,
    },
    adminShare: {
      type: mongoose.Schema.Types.Number,
      required: true,
    },
    type: {
      type: mongoose.Schema.Types.String,
      enum: ["debit", "credit", "refund"],
      required: true,
    },
    status: {
      type: mongoose.Schema.Types.String,
      enum: ["confirmed", "refunded"],
      required: true,
    },
    description: {
      type: mongoose.Schema.Types.String,
      required: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export const MentorWallet = mongoose.model<IMentorWallet>(
  "MentorWallet",
  MentorWalletSchema
);
