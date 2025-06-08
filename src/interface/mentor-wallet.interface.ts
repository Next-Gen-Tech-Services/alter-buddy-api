import { Types } from "mongoose";

export interface IMentorWallet {
  userId: Types.ObjectId;
  mentorId: Types.ObjectId;
  slotId?: Types.ObjectId;
  amount: number;
  mentorShare: number;
  adminShare: number;
  type: "debit" | "credit" | "refund";
  status: "confirmed" | "refunded";
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
